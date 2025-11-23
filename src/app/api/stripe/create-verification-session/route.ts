import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Use production Stripe keys for loan verification (existing flow)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

/**
 * Create Stripe Identity Verification Session for LOANS only
 * This endpoint uses production Stripe keys and is used by /apply/[loanId]
 *
 * For standalone verifications, use /api/verifications/identity-session instead
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, loanId, returnUrl } = body;

    if (!loanId) {
      return NextResponse.json(
        { error: 'loanId is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Creating loan verification session:', { loanId });

    // Build metadata for loan verification
    const metadata: Record<string, string> = {
      loan_id: loanId,
      first_name: firstName || '',
      last_name: lastName || '',
      type: 'loan_verification',
      domain: request.headers.get('host') || 'unknown',
      created_at: new Date().toISOString(),
    };

    // Create the verification session with selfie check
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      provided_details: {
        email: email,
      },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      metadata,
      return_url: returnUrl || undefined,
    });

    console.log('✅ Created loan verification session:', {
      sessionId: verificationSession.id,
      loanId,
      status: verificationSession.status,
    });

    return NextResponse.json({
      success: true,
      client_secret: verificationSession.client_secret,
      verification_session_id: verificationSession.id,
      url: verificationSession.url,
    });

  } catch (error: unknown) {
    console.error('❌ Error creating loan verification session:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create verification session' },
      { status: 500 }
    );
  }
}