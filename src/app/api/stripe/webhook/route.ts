import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
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
 * Get or Create Late Fee Product and Price
 * Ensures we have a reusable late fee product in Stripe
 */
async function getOrCreateLateFeePrice(): Promise<string> {
  try {
    // Search for existing late fee product
    const products = await stripe.products.search({
      query: 'name:"Late Fee"',
    });

    let product: Stripe.Product;
    
    if (products.data.length > 0) {
      product = products.data[0];
      console.log('✅ Found existing late fee product:', product.id);
    } else {
      // Create new late fee product
      product = await stripe.products.create({
        name: 'Late Fee',
        description: 'Late payment fee for overdue invoices',
        metadata: {
          type: 'late_fee',
        },
      });
      console.log('✅ Created late fee product:', product.id);
    }

    // Search for existing price
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    if (prices.data.length > 0) {
      const existingPrice = prices.data.find(p => p.unit_amount === 1500); // $15.00
      if (existingPrice) {
        console.log('✅ Found existing late fee price:', existingPrice.id);
        return existingPrice.id;
      }
    }

    // Create new price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 1500, // $15.00
      currency: 'usd',
      metadata: {
        type: 'late_fee',
      },
    });

    console.log('✅ Created late fee price:', price.id);
    return price.id;

  } catch (error) {
    console.error('❌ Error getting/creating late fee price:', error);
    throw error;
  }
}

/**
 * Handle Overdue Invoice Events
 * Voids the original invoice and creates a new one with late fee
 */
async function handleOverdueInvoice(invoice: Stripe.Invoice) {
  try {
    // Get subscription ID from the first subscription line item
    const subscriptionLineItem = invoice.lines.data.find(line => line.subscription);
    const subscriptionId = subscriptionLineItem?.subscription as string;

    console.log('⏰ Processing overdue invoice:', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      subscriptionId: subscriptionId,
      amount: invoice.amount_due / 100,
    });

    // Check if this is already a late fee invoice
    if (invoice.metadata?.is_late_fee_invoice === 'true') {
      console.log('ℹ️ Skipping late fee for invoice that already includes late fees');
      return;
    }

    // Check if late fee was already applied
    if (invoice.metadata?.has_late_fee_applied === 'true') {
      console.log('ℹ️ Late fee already applied to this invoice');
      return;
    }

    // Skip if no subscription found (not a subscription invoice)
    if (!subscriptionId) {
      console.log('ℹ️ No subscription found for invoice, skipping late fee');
      return;
    }

    // Get late fee price
    const lateFeePrice = await getOrCreateLateFeePrice();

    if (!invoice.id) {
      console.error('❌ No invoice ID found in invoice object');
      return;
    }

    // Mark original invoice with metadata before voiding
    await stripe.invoices.update(invoice.id, {
      metadata: {
        ...invoice.metadata,
        has_late_fee_applied: 'true',
      },
    });

    // Void the original invoice
    await stripe.invoices.voidInvoice(invoice.id);
    console.log('✅ Voided original invoice:', invoice.id);

    // Create new invoice with original items plus late fee
    const newInvoice = await stripe.invoices.create({
      customer: invoice.customer as string
    });

    // Add all original line items
    for (const line of invoice.lines.data) {
      if (line.subscription) {
        // For subscription items, use the subscription_item property
        await stripe.invoiceItems.create({
          customer: invoice.customer as string,
          invoice: newInvoice.id,
          subscription: line.subscription as string,
          quantity: line.quantity || 1,
          description: line.description || undefined,
        });
      }
    }

    // Add late fee
    await stripe.invoiceItems.create({
      customer: invoice.customer as string,
      invoice: newInvoice.id,
      pricing :{
        price: lateFeePrice,
      },
      description: `Late fee for overdue invoice ${invoice.number || invoice.id}`,
    });

    // Finalize and send the new invoice
    await stripe.invoices.finalizeInvoice(newInvoice.id as string);
    
    // Send the invoice to customer
    await stripe.invoices.sendInvoice(newInvoice.id as string);

    console.log('✅ Created and sent new invoice with late fee:', {
      newInvoiceId: newInvoice.id,
      originalInvoiceId: invoice.id,
      totalAmount: newInvoice.amount_due / 100,
    });

  } catch (error) {
    console.error('❌ Error handling overdue invoice:', error);
    throw error;
  }
}

/**
 * Handle Subscription Payment Events
 * Updates payment records and loan status based on subscription events
 */
async function handleSubscriptionPayment(invoice: Stripe.Invoice & {
  subscription?: string | Stripe.Subscription;
  payment_intent?: string | Stripe.PaymentIntent;
  amount_paid?: number;
  amount_due?: number;
}, status: 'succeeded' | 'failed') {
  try {
    console.log('💳 Processing subscription payment:', {
      invoiceId: invoice.id,
      subscriptionId: invoice.subscription,
      status,
      amount: invoice.amount_paid
    });

    const supabase = await createClient();
    
    // Get subscription to find loan information
    if (!invoice.subscription) {
      console.error('❌ No subscription ID found in invoice');
      return;
    }

    const subscriptionId = typeof invoice.subscription === 'string' ? 
      invoice.subscription : 
      invoice.subscription.id;
    
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const loanId = subscription.metadata?.loan_id;

    if (!loanId) {
      console.error('❌ No loan_id found in subscription metadata');
      return;
    }

    // Get current payment schedule entry (try pending first, then any status)
    let { data: paymentSchedules } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('loan_id', loanId)
      .eq('status', 'pending')
      .order('payment_number')
      .limit(1);

    // If no pending payment found, get the first payment (regardless of status)
    if (!paymentSchedules || paymentSchedules.length === 0) {
      const { data: firstPayment } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('loan_id', loanId)
        .eq('payment_number', 1)
        .limit(1);
      
      paymentSchedules = firstPayment;
    }

    const currentPayment = paymentSchedules?.[0];
    
    if (!currentPayment) {
      console.log('⚠️ No payment schedule found for loan:', loanId);
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
          payment_method: 'stripe_subscription',
          stripe_payment_intent_id: typeof invoice.payment_intent === 'string' ? 
            invoice.payment_intent : 
            invoice.payment_intent?.id || null,
          status: 'completed',
          notes: `Stripe subscription payment - Invoice: ${invoice.id}`
        });

      // Check if this was the first payment (loan in funding_in_progress status)
      const { data: loanData } = await supabase
        .from('loans')
        .select('status, stripe_subscription_id')
        .eq('id', loanId)
        .single();

      if (loanData?.status === 'funding_in_progress' && loanData?.stripe_subscription_id === subscriptionId) {
        // This is the first payment completing - update loan to funded
        await supabase
          .from('loans')
          .update({
            status: 'funded',
            updated_at: new Date().toISOString()
          })
          .eq('id', loanId);

        console.log('🎉 First payment completed - loan now funded:', loanId);
      } else {
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
          payment_method: 'stripe_subscription',
          stripe_payment_intent_id: typeof invoice.payment_intent === 'string' ? 
            invoice.payment_intent : 
            invoice.payment_intent?.id || null,
          status: 'failed',
          notes: `Stripe subscription payment failed - Invoice: ${invoice.id}`
        });

      console.log('❌ Payment failed recorded:', {
        loanId,
        paymentNumber: currentPayment.payment_number,
        amount: invoice.amount_due / 100
      });
    }

  } catch (error) {
    console.error('❌ Error in handleSubscriptionPayment:', error);
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
        await handleSubscriptionPayment(event.data.object, 'succeeded');
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
        await handleSubscriptionPayment(event.data.object, 'failed');
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