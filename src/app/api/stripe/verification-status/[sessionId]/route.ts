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

    // Retrieve the verification session from Stripe with expanded verification report
    const verificationSession = await stripe.identity.verificationSessions.retrieve(sessionId, {
      expand: ['last_verification_report'],
    });

    // Extract verification report data
    const verificationReport = verificationSession.last_verification_report as Stripe.Identity.VerificationReport | null;
    
    console.log('✅ Retrieved verification session:', {
      sessionId,
      status: verificationSession.status,
      lastError: verificationSession.last_error,
      metadata: verificationSession.metadata,
      verifiedOutputs: verificationSession.verified_outputs ? 'present' : 'missing',
      documentStatus: verificationReport?.document?.status,
      selfieStatus: verificationReport?.selfie?.status,
      documentError: verificationReport?.document?.error,
      selfieError: verificationReport?.selfie?.error
    });

    return NextResponse.json({
      status: verificationSession.status,
      last_error: verificationSession.last_error,
      verified_outputs: verificationSession.verified_outputs,
      verification_report: verificationReport ? {
        document: {
          status: verificationReport.document?.status,
          error: verificationReport.document?.error,
        },
        selfie: {
          status: verificationReport.selfie?.status,
          error: verificationReport.selfie?.error,
        },
      } : null,
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