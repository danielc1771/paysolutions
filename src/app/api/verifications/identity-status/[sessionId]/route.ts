import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Use separate Stripe keys for standalone verifications (test mode)
// Falls back to production keys if verification-specific keys not configured
const stripe = new Stripe(
  process.env.STRIPE_VERIFICATION_SECRET_KEY || process.env.STRIPE_SECRET_KEY!,
  { apiVersion: '2025-09-30.clover' }
);

/**
 * Get Stripe Identity Verification Session Status for STANDALONE VERIFICATIONS only
 * This endpoint uses test Stripe keys (STRIPE_VERIFICATION_SECRET_KEY) if configured
 *
 * For loan verifications, use /api/stripe/verification-status/[sessionId] instead
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    console.log('🔍 Retrieving standalone verification session:', sessionId);

    // Retrieve the verification session from Stripe with expanded verification report
    const verificationSession = await stripe.identity.verificationSessions.retrieve(sessionId, {
      expand: ['last_verification_report'],
    });

    // Extract verification report data
    const verificationReport = verificationSession.last_verification_report as Stripe.Identity.VerificationReport | null;

    console.log('✅ Retrieved standalone verification session:', {
      sessionId,
      status: verificationSession.status,
      lastError: verificationSession.last_error,
      metadata: verificationSession.metadata,
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
    console.error('❌ Error retrieving standalone verification session:', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve verification session' },
      { status: 500 }
    );
  }
}
