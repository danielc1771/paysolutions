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

      case 'identity.verification_session.created':
      case 'identity.verification_session.requires_input':
      case 'identity.verification_session.processing':
      case 'identity.verification_session.redacted':
      case 'identity.verification_session.canceled':
      case 'identity.verification_session.verified':
      case 'identity.verification_session.unverified':
        await handleIdentityVerificationSession(event.data.object, supabase);
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
        notes: `Failed extra payment attempt of ${amount} for loan ${loanId}`
      });

    if (auditError) {
      console.error('Error logging failed payment audit:', auditError);
    }

    console.log(`Payment failure logged for loan ${loanId}: ${amount}`);

  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleIdentityVerificationSession(session: any, supabase: any) {
  try {
    const loanId = session.metadata?.loanId;
    const newStatus = session.status; // e.g., 'verified', 'requires_input', 'unverified'

    if (!loanId) {
      console.warn('Identity verification session event received without loanId in metadata:', session);
      return;
    }

    // Update the loan's stripeVerificationStatus
    const { data: loan, error: loanUpdateError } = await supabase
      .from('loans')
      .update({ stripe_verification_status: newStatus })
      .eq('id', loanId)
      .select('borrower_id')
      .single();

    if (loanUpdateError) {
      console.error(`Error updating loan ${loanId} verification status:`, loanUpdateError);
      return;
    }

    console.log(`Loan ${loanId} Stripe verification status updated to: ${newStatus}`);

    // Update the borrower's kycStatus if the verification is conclusive
    if (loan && loan.borrower_id && (newStatus === 'verified' || newStatus === 'unverified')) {
      const kycStatus = newStatus === 'verified' ? 'verified' : 'failed';
      const { error: borrowerUpdateError } = await supabase
        .from('borrowers')
        .update({ kyc_status: kycStatus })
        .eq('id', loan.borrower_id);

      if (borrowerUpdateError) {
        console.error(`Error updating borrower ${loan.borrower_id} KYC status:`, borrowerUpdateError);
      }
      console.log(`Borrower ${loan.borrower_id} KYC status updated to: ${kycStatus}`);
    }

  } catch (error) {
    console.error('Error handling identity verification session:', error);
  }
}
