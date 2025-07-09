import { NextRequest, NextResponse } from 'next/server';

/**
 * Stripe Webhook Handler
 * 
 * TODO: Re-implement webhook functionality after deployment to live site
 * Webhook functionality requires proper HTTPS endpoints and cannot be fully
 * tested in local development environment.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Stripe webhook received - functionality disabled for build');
    console.log('📝 Request headers:', Object.fromEntries(request.headers.entries()));
    
    // For now, just acknowledge receipt
    return NextResponse.json({ 
      received: true,
      message: 'Webhook functionality disabled for build - will be implemented on live site'
    });

  } catch (error: unknown) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler disabled for build' },
      { status: 200 } // Return 200 to avoid Stripe retries
    );
  }
}