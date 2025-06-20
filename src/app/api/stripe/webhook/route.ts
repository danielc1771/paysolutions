import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event;

    // Check if Stripe keys are configured for real webhook verification
    if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET!
        );
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        );
      }
    } else {
      // Demo mode - parse body as JSON without verification
      try {
        event = JSON.parse(body);
      } catch (err) {
        console.error('Error parsing webhook body:', err);
        return NextResponse.json(
          { error: 'Invalid JSON body' },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object, supabase);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object, supabase);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: any, supabase: any) {
  try {
    const { loanId, borrowerEmail, paymentType } = paymentIntent.metadata;
    const amount = paymentIntent.amount / 100; // Convert from cents

    // Record the payment in our database
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        loan_id: loanId,
        payment_type: 'extra',
        scheduled_amount: amount,
        actual_amount_paid: amount,
        status: 'paid',
        paid_date: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntent.id,
        notes: `Extra payment via Stripe - ${paymentType}`
      });

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      return;
    }

    // Log the event in audit trail
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        table_name: 'payments',
        action: 'INSERT',
        changed_by: borrowerEmail,
        changes: {
          payment_type: 'extra',
          amount: amount,
          stripe_payment_intent_id: paymentIntent.id,
          status: 'paid'
        },
        notes: `Extra payment of $${amount} processed via Stripe`
      });

    if (auditError) {
      console.error('Error logging audit trail:', auditError);
    }

    console.log(`Payment recorded successfully: $${amount} for loan ${loanId}`);

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailure(paymentIntent: any, supabase: any) {
  try {
    const { loanId, borrowerEmail } = paymentIntent.metadata;
    const amount = paymentIntent.amount / 100;

    // Log the failed payment attempt
    const { error: auditError } = await supabase
      .from('audit_log')
      .insert({
        table_name: 'payments',
        action: 'FAILED',
        changed_by: borrowerEmail,
        changes: {
          payment_type: 'extra',
          amount: amount,
          stripe_payment_intent_id: paymentIntent.id,
          status: 'failed',
          failure_reason: paymentIntent.last_payment_error?.message || 'Unknown error'
        },
        notes: `Failed extra payment attempt of $${amount} for loan ${loanId}`
      });

    if (auditError) {
      console.error('Error logging failed payment audit:', auditError);
    }

    console.log(`Payment failure logged for loan ${loanId}: $${amount}`);

  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}
