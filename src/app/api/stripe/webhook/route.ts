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

    // Get current payment schedule entry
    const { data: paymentSchedules } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('loan_id', loanId)
      .eq('status', 'pending')
      .order('payment_number')
      .limit(1);

    const currentPayment = paymentSchedules?.[0];
    
    if (!currentPayment) {
      console.log('⚠️ No pending payment found for loan:', loanId);
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
 * Handle Payment Intent Events
 * For one-time payments like the first payment
 */
async function handlePaymentIntent(paymentIntent: Stripe.PaymentIntent, status: 'succeeded' | 'failed') {
  try {
    console.log('💰 Processing payment intent:', {
      paymentIntentId: paymentIntent.id,
      status,
      amount: paymentIntent.amount,
      metadata: paymentIntent.metadata
    });

    const supabase = await createClient();
    const loanId = paymentIntent.metadata?.loan_id;
    const paymentType = paymentIntent.metadata?.payment_type;

    if (!loanId) {
      console.error('❌ No loan_id found in payment intent metadata');
      return;
    }

    if (paymentType === 'first_payment' && status === 'succeeded') {
      // Record the first payment
      const { data: firstPayment } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('loan_id', loanId)
        .eq('payment_number', 1)
        .single();

      if (firstPayment) {
        // Update first payment as paid
        await supabase
          .from('payment_schedules')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
            paid_amount: (paymentIntent.amount / 100).toString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', firstPayment.id);

        // Create payment record
        await supabase
          .from('payments')
          .insert({
            loan_id: loanId,
            payment_schedule_id: firstPayment.id,
            amount: (paymentIntent.amount / 100).toString(),
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: 'stripe_payment_intent',
            stripe_payment_intent_id: paymentIntent.id,
            status: 'completed',
            notes: 'First payment via Stripe Payment Intent'
          });

        console.log('✅ First payment recorded successfully:', {
          loanId,
          amount: paymentIntent.amount / 100
        });
      }
    }

  } catch (error) {
    console.error('❌ Error in handlePaymentIntent:', error);
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
      case 'payment_intent.succeeded':
        console.log('💳 Payment succeeded:', event.data.object.id);
        await handlePaymentIntent(event.data.object, 'succeeded');
        break;

      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', event.data.object.id);
        await handlePaymentIntent(event.data.object, 'failed');
        break;

      case 'setup_intent.succeeded':
        console.log('🔧 Setup intent succeeded:', event.data.object.id);
        // Payment method has been set up successfully
        // The actual funding completion happens via API call after frontend confirmation
        break;

      case 'invoice.payment_succeeded':
        console.log('📄 Invoice payment succeeded:', event.data.object.id);
        await handleSubscriptionPayment(event.data.object, 'succeeded');
        break;

      case 'invoice.payment_failed':
        console.log('📄 Invoice payment failed:', event.data.object.id);
        await handleSubscriptionPayment(event.data.object, 'failed');
        break;

      case 'customer.subscription.created':
        console.log('🔄 Subscription created:', event.data.object.id);
        break;

      case 'customer.subscription.updated':
        console.log('🔄 Subscription updated:', event.data.object.id);
        break;

      case 'customer.subscription.deleted':
        console.log('🗑️ Subscription deleted:', event.data.object.id);
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

      case 'customer.created':
        console.log('👤 Customer created:', event.data.object.id);
        break;

      case 'customer.updated':
        console.log('👤 Customer updated:', event.data.object.id);
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