import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

/**
 * Stripe Webhooks Handler (Alternative Endpoint)
 * 
 * Backup webhook endpoint for Stripe events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature')!;
    
    console.log('🔄 Stripe webhooks received (backup endpoint)');
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

    console.log('✅ Webhook event verified (backup):', event.type);

    // Handle different event types (same as main endpoint)
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('💳 Payment succeeded (backup):', event.data.object.id);
        // TODO: Update loan status in database
        break;

      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed (backup):', event.data.object.id);
        // TODO: Handle payment failure
        break;

      case 'setup_intent.succeeded':
        console.log('🔧 Setup intent succeeded (backup):', event.data.object.id);
        // TODO: Handle payment method setup
        break;

      case 'customer.created':
        console.log('👤 Customer created (backup):', event.data.object.id);
        break;

      case 'customer.updated':
        console.log('👤 Customer updated (backup):', event.data.object.id);
        break;

      case 'invoice.payment_succeeded':
        console.log('📄 Invoice payment succeeded (backup):', event.data.object.id);
        break;

      case 'invoice.payment_failed':
        console.log('📄 Invoice payment failed (backup):', event.data.object.id);
        break;

      default:
        console.log('⚠️ Unhandled event type (backup):', event.type);
    }

    return NextResponse.json({ received: true, event: event.type, endpoint: 'backup' });

  } catch (error: unknown) {
    console.error('❌ Webhooks error:', error);
    return NextResponse.json(
      { error: 'Webhooks handler error' },
      { status: 500 }
    );
  }
}