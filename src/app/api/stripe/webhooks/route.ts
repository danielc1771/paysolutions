import { NextResponse } from 'next/server';

/**
 * Stripe Webhooks Handler (Alternative Endpoint)
 * 
 * TODO: Re-implement webhook functionality after deployment to live site
 * Webhook functionality requires proper HTTPS endpoints and cannot be fully
 * tested in local development environment.
 */
export async function POST() {
  try {
    console.log('🔄 Stripe webhooks received - functionality disabled for build');
    
    return NextResponse.json({ 
      received: true,
      message: 'Webhooks functionality disabled for build - will be implemented on live site'
    });

  } catch (error: unknown) {
    console.error('❌ Webhooks error:', error);
    return NextResponse.json(
      { error: 'Webhooks handler disabled for build' },
      { status: 200 } // Return 200 to avoid Stripe retries
    );
  }
}