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
async function handleIdentityVerification(verificationSession: any, status: string) {
  try {
    console.log('🔄 Processing identity verification update:', {
      sessionId: verificationSession.id,
      status,
      metadata: verificationSession.metadata
    });

    const supabase = createClient();
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
 * Stripe Webhook Handler
 * 
 * Handles Stripe webhook events for payment processing and identity verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;
    
    console.log('🔄 Stripe webhook received');
    console.log('📝 Signature present:', !!signature);
    console.log('📝 Body length:', body.length);
    
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
        // TODO: Update loan status in database
        break;

      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', event.data.object.id);
        // TODO: Handle payment failure
        break;

      case 'setup_intent.succeeded':
        console.log('🔧 Setup intent succeeded:', event.data.object.id);
        // TODO: Handle payment method setup
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

      case 'invoice.payment_succeeded':
        console.log('📄 Invoice payment succeeded:', event.data.object.id);
        break;

      case 'invoice.payment_failed':
        console.log('📄 Invoice payment failed:', event.data.object.id);
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