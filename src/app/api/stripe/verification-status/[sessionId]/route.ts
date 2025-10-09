import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function GET(
  request: Request, 
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    console.log('🔍 Retrieving verification session:', sessionId);
    console.log('📝 Request details:', {
      sessionId,
      domain: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer')
    });

    // Retrieve the verification session from Stripe
    const verificationSession = await stripe.identity.verificationSessions.retrieve(sessionId);

    console.log('✅ Retrieved verification session:', {
      sessionId,
      status: verificationSession.status,
      lastError: verificationSession.last_error,
      metadata: verificationSession.metadata,
      verifiedOutputs: verificationSession.verified_outputs ? 'present' : 'missing'
    });

    return NextResponse.json({
      status: verificationSession.status,
      last_error: verificationSession.last_error,
      verified_outputs: verificationSession.verified_outputs,
    });

  } catch (error: unknown) {
    console.error('❌ Error retrieving verification session:', {
      sessionId: (await params).sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      apiVersion: '2025-06-30.basil'
    });
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve verification session' },
      { status: 500 }
    );
  }
}