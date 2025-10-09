import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

/**
 * Handle Identity Verification Updates
 * Updates the database with verification status changes
 */
async function handleIdentityVerification(verificationSession: Stripe.Identity.VerificationSession, status: string) {
  try {
    console.log('🔄 Processing identity verification update:', {
      sessionId: verificationSession.id,
      status,
      metadata: verificationSession.metadata
    });

    const supabase = await createClient();
    const loanId = verificationSession.metadata?.loan_id;

    if (!loanId) {
      console.error('❌ No loan_id found in verification session metadata');
      return;
    }

    // Update loan record with verification status
    const { error } = await supabase
      .from('loans')
      .update({
        stripe_verification_status: status,
        stripe_verification_session_id: verificationSession.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', loanId);

    if (error) {
      console.error('❌ Failed to update loan verification status:', error);
      throw error;
    }

    console.log('✅ Successfully updated loan verification status:', {
      loanId,
      status,
      sessionId: verificationSession.id
    });

  } catch (error) {
    console.error('❌ Error in handleIdentityVerification:', error);
    throw error;
  }
}

/**
 * Handle Overdue Invoice Events
 *
 * Adds a one-time $15 late fee line item to overdue invoices.
 * The late fee is only applied once per invoice via metadata tracking.
 */
async function handleOverdueInvoice(invoice: Stripe.Invoice) {
  try {
    console.log('⏰ Processing overdue invoice:', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due / 100,
      paymentNumber: invoice.metadata?.payment_number,
    });

    // IDEMPOTENCY CHECK: Ensure late fee is only applied once per invoice
    if (invoice.metadata?.has_late_fee_applied === 'true') {
      console.log('ℹ️ Late fee already applied to this invoice - skipping');
      return;
    }

    // Skip if invoice is already paid or voided
    if (invoice.status === 'paid' || invoice.status === 'void') {
      console.log('ℹ️ Invoice already paid or voided - skipping late fee');
      return;
    }

    if (!invoice.id) {
      console.error('❌ No invoice ID found in invoice object');
      return;
    }

    // Add $15 late fee as a line item to the existing open invoice
    // Stripe will automatically update the invoice total
    await stripe.invoiceItems.create({
      customer: invoice.customer as string,
      invoice: invoice.id,
      amount: 1500, // $15.00 in cents
      currency: 'usd',
      description: `Late Fee - Payment ${invoice.metadata?.payment_number || 'N/A'}`,
    });

    // Mark invoice metadata to prevent duplicate late fee charges
    await stripe.invoices.update(invoice.id, {
      metadata: {
        ...invoice.metadata,
        has_late_fee_applied: 'true',
        late_fee_applied_at: new Date().toISOString(),
      },
    });

    console.log('✅ Added $15 late fee to invoice:', {
      invoiceId: invoice.id,
      paymentNumber: invoice.metadata?.payment_number,
      originalAmount: invoice.amount_due / 100,
      newTotal: (invoice.amount_due + 1500) / 100, // Original + $15
    });

  } catch (error) {
    console.error('❌ Error handling overdue invoice:', error);
    throw error;
  }
}

/**
 * Handle Invoice Payment Events
 * Updates payment records and loan status based on invoice payments
 */
async function handleInvoicePayment(invoice: Stripe.Invoice & {
  subscription?: string | Stripe.Subscription;
  payment_intent?: string | Stripe.PaymentIntent;
  amount_paid?: number;
  amount_due?: number;
}, status: 'succeeded' | 'failed') {
  try {
    console.log('💳 Processing invoice payment:', {
      invoiceId: invoice.id,
      status,
      amount: invoice.amount_paid,
      paymentNumber: invoice.metadata?.payment_number
    });

    const supabase = await createClient();

    // Get loan ID from invoice metadata
    const loanId = invoice.metadata?.loan_id;

    if (!loanId) {
      console.error('❌ No loan_id found in invoice metadata');
      return;
    }

    // Get the payment number from invoice metadata
    const paymentNumber = invoice.metadata?.payment_number;
    if (!paymentNumber) {
      console.error('❌ No payment_number found in invoice metadata');
      return;
    }

    // Get the specific payment schedule entry for this payment number
    const { data: paymentSchedules } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('loan_id', loanId)
      .eq('payment_number', parseInt(paymentNumber))
      .limit(1);

    const currentPayment = paymentSchedules?.[0];

    if (!currentPayment) {
      console.log('⚠️ No payment schedule found for loan:', loanId, 'payment:', paymentNumber);
      return;
    }

    if (status === 'succeeded') {
      // Update payment schedule record
      await supabase
        .from('payment_schedules')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
          paid_amount: (invoice.amount_paid / 100).toString(), // Convert from cents
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPayment.id);

      // Create payment record
      await supabase
        .from('payments')
        .insert({
          loan_id: loanId,
          payment_schedule_id: currentPayment.id,
          amount: (invoice.amount_paid / 100).toString(),
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'stripe_invoice',
          stripe_payment_intent_id: typeof invoice.payment_intent === 'string' ?
            invoice.payment_intent :
            invoice.payment_intent?.id || null,
          status: 'completed',
          notes: `Stripe invoice payment - Invoice: ${invoice.id} - Payment ${paymentNumber}`
        });

      // Check if this was the last payment
      const { data: remainingPayments } = await supabase
        .from('payment_schedules')
        .select('id')
        .eq('loan_id', loanId)
        .eq('status', 'pending');

      if (!remainingPayments || remainingPayments.length === 0) {
        // All payments completed - mark loan as closed
        await supabase
          .from('loans')
          .update({
            status: 'closed',
            remaining_balance: '0.00',
            updated_at: new Date().toISOString()
          })
          .eq('id', loanId);

        console.log('🎉 Loan fully paid off:', loanId);
      }

      console.log('✅ Payment recorded successfully:', {
        loanId,
        paymentNumber: currentPayment.payment_number,
        amount: invoice.amount_paid / 100
      });

    } else if (status === 'failed') {
      // Record failed payment
      await supabase
        .from('payments')
        .insert({
          loan_id: loanId,
          payment_schedule_id: currentPayment.id,
          amount: (invoice.amount_due / 100).toString(),
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'stripe_invoice',
          stripe_payment_intent_id: typeof invoice.payment_intent === 'string' ?
            invoice.payment_intent :
            invoice.payment_intent?.id || null,
          status: 'failed',
          notes: `Stripe invoice payment failed - Invoice: ${invoice.id} - Payment ${paymentNumber}`
        });

      console.log('❌ Payment failed recorded:', {
        loanId,
        paymentNumber: currentPayment.payment_number,
        amount: invoice.amount_due / 100
      });
    }

  } catch (error) {
    console.error('❌ Error in handleInvoicePayment:', error);
    throw error;
  }
}


/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for payment processing and identity verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    
    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    console.log('✅ Webhook event verified:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'invoice.payment_succeeded':
        console.log('📄 Invoice payment succeeded:', event.data.object.id);
        await handleInvoicePayment(event.data.object, 'succeeded');
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.log('📄 Invoice payment failed:', {
          invoiceId: failedInvoice.id,
          customerId: failedInvoice.customer,
          amount: failedInvoice.amount_due / 100,
          attemptCount: failedInvoice.attempt_count,
          nextPaymentAttempt: failedInvoice.next_payment_attempt ? new Date(failedInvoice.next_payment_attempt * 1000).toISOString() : null,
        });
        await handleInvoicePayment(event.data.object, 'failed');
        break;

      
      case 'invoice.sent':
        const sentInvoice = event.data.object as Stripe.Invoice;
        console.log('📧 Invoice sent to customer:', {
          invoiceId: sentInvoice.id,
          customerEmail: sentInvoice.customer_email,
          hostedInvoiceUrl: sentInvoice.hosted_invoice_url,
          amountDue: sentInvoice.amount_due / 100,
          dueDate: sentInvoice.due_date ? new Date(sentInvoice.due_date * 1000).toISOString() : null,
        });
        break;
      
      case 'invoice.overdue':
        console.log('⏰ Invoice overdue:', event.data.object.id);
        await handleOverdueInvoice(event.data.object);
        break;

      case 'identity.verification_session.verified':
        console.log('✅ Identity verification succeeded:', event.data.object.id);
        await handleIdentityVerification(event.data.object, 'verified');
        break;

      case 'identity.verification_session.requires_input':
        console.log('⚠️ Identity verification requires input:', event.data.object.id);
        await handleIdentityVerification(event.data.object, 'requires_action');
        break;

      case 'identity.verification_session.processing':
        console.log('🔄 Identity verification processing:', event.data.object.id);
        await handleIdentityVerification(event.data.object, 'processing');
        break;

      case 'identity.verification_session.canceled':
        console.log('❌ Identity verification canceled:', event.data.object.id);
        await handleIdentityVerification(event.data.object, 'canceled');
        break;

      default:
        console.log('⚠️ Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true, event: event.type });

  } catch (error: unknown) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 }
    );
  }
}