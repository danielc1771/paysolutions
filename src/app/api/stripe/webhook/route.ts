import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import { reportVerificationUsage } from '@/utils/stripe/verification-billing';

// Main Stripe client for payments
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

// Verification Stripe client (may use test keys)
const stripeVerification = new Stripe(
  process.env.STRIPE_VERIFICATION_SECRET_KEY || process.env.STRIPE_SECRET_KEY!,
  { apiVersion: '2025-09-30.clover' }
);

/**
 * Handle Identity Verification Updates
 * Updates the database with verification status changes
 * Supports both loans and standalone verifications
 */
async function handleIdentityVerification(verificationSession: Stripe.Identity.VerificationSession, status: string) {
  try {
    console.log('🔄 Processing identity verification update:', {
      sessionId: verificationSession.id,
      status,
      metadata: verificationSession.metadata
    });

    const supabase = await createAdminClient();
    const loanId = verificationSession.metadata?.loan_id;
    const verificationId = verificationSession.metadata?.verification_id;

    // Handle standalone verification
    if (verificationId) {
      console.log('📋 Processing standalone verification:', verificationId);

      // Get current verification to check phone status and organization
      const { data: currentVerification } = await supabase
        .from('verifications')
        .select('phone_verification_status, phone, organization_id')
        .eq('id', verificationId)
        .single();

      const isPhoneVerified = currentVerification?.phone_verification_status === 'verified';
      const requiresPhone = !!currentVerification?.phone;

      // Determine the new status
      let newStatus = 'in_progress';
      if (status === 'verified') {
        if (!requiresPhone || isPhoneVerified) {
          // Fully completed if no phone required or phone already verified
          newStatus = 'completed';
        } else {
          // Identity verified, waiting for phone
          newStatus = 'identity_verified';
        }
      } else if (status === 'requires_action') {
        newStatus = 'in_progress';
      } else if (status === 'canceled') {
        newStatus = 'failed';
      }

      const updateData: Record<string, string | null> = {
        stripe_verification_status: status,
        stripe_verification_session_id: verificationSession.id,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Add completion timestamp if verified
      if (status === 'verified') {
        updateData.stripe_verified_at = new Date().toISOString();
        if (newStatus === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('verifications')
        .update(updateData)
        .eq('id', verificationId);

      if (error) {
        console.error('❌ Failed to update verification status:', error);
        throw error;
      }

      // Report usage for billing when verification is completed
      if (newStatus === 'completed' && currentVerification?.organization_id) {
        try {
          await reportVerificationUsage(currentVerification.organization_id, verificationId);
          console.log('📊 Reported verification usage for billing');
        } catch (billingError) {
          console.error('Error reporting verification usage:', billingError);
          // Don't fail webhook if billing fails
        }
      }

      console.log('✅ Successfully updated standalone verification status:', {
        verificationId,
        status,
        newStatus,
        sessionId: verificationSession.id
      });

      return;
    }

    // Handle loan verification (original behavior)
    if (loanId) {
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

      return;
    }

    console.error('❌ No loan_id or verification_id found in verification session metadata');

  } catch (error) {
    console.error('❌ Error in handleIdentityVerification:', error);
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

    const supabase = await createAdminClient();

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
 * Supports separate webhook secrets for production payments and test verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    // Try to verify with primary webhook secret first, then verification secret
    let event: Stripe.Event | null = null;
    let verifiedWith: 'primary' | 'verification' = 'primary';

    // Try primary webhook secret (for production payments)
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      verifiedWith = 'primary';
    } catch {
      // If primary fails and we have a separate verification secret, try that
      const verificationWebhookSecret = process.env.STRIPE_VERIFICATION_WEBHOOK_SECRET;
      if (verificationWebhookSecret) {
        try {
          event = stripeVerification.webhooks.constructEvent(
            body,
            signature,
            verificationWebhookSecret
          );
          verifiedWith = 'verification';
        } catch (verificationErr) {
          console.error('❌ Both webhook signature verifications failed');
          console.error('Primary error and verification error:', verificationErr);
          return NextResponse.json(
            { error: 'Webhook signature verification failed' },
            { status: 400 }
          );
        }
      } else {
        console.error('❌ Webhook signature verification failed (no verification secret configured)');
        return NextResponse.json(
          { error: 'Webhook signature verification failed' },
          { status: 400 }
        );
      }
    }

    console.log('✅ Webhook event verified:', event.type, `(using ${verifiedWith} secret)`);

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