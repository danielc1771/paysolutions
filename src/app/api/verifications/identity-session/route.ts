import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createAdminClient } from '@/utils/supabase/admin';

// Use separate Stripe keys for standalone verifications (test mode)
// Falls back to production keys if verification-specific keys not configured
const stripe = new Stripe(
  process.env.STRIPE_VERIFICATION_SECRET_KEY || process.env.STRIPE_SECRET_KEY!,
  { apiVersion: '2025-09-30.clover' }
);

/**
 * Create Stripe Identity Verification Session for STANDALONE VERIFICATIONS only
 * This endpoint uses test Stripe keys (STRIPE_VERIFICATION_SECRET_KEY) if configured
 *
 * For loan verifications, use /api/stripe/create-verification-session instead
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { verificationId, returnUrl } = body;

    if (!verificationId) {
      return NextResponse.json(
        { error: 'verificationId is required' },
        { status: 400 }
      );
    }

    console.log('🚀 Creating standalone verification session:', { verificationId });

    // Get verification details from database
    const supabase = await createAdminClient();
    const { data: verification, error: fetchError } = await supabase
      .from('verifications')
      .select('id, email, first_name, last_name, stripe_verification_session_id')
      .eq('id', verificationId)
      .single();

    if (fetchError || !verification) {
      console.error('❌ Verification not found:', fetchError);
      return NextResponse.json(
        { error: 'Verification not found' },
        { status: 404 }
      );
    }

    // Build metadata for standalone verification
    const metadata: Record<string, string> = {
      verification_id: verificationId,
      first_name: verification.first_name || '',
      last_name: verification.last_name || '',
      type: 'standalone_verification',
      domain: request.headers.get('host') || 'unknown',
      created_at: new Date().toISOString(),
    };

    // Create the verification session with selfie check
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      provided_details: {
        email: verification.email,
      },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      metadata,
      return_url: returnUrl || undefined,
    });

    console.log('✅ Created standalone verification session:', {
      sessionId: verificationSession.id,
      verificationId,
      status: verificationSession.status,
    });

    // Update the verification record with the session ID
    const { error: updateError } = await supabase
      .from('verifications')
      .update({
        stripe_verification_session_id: verificationSession.id,
        stripe_verification_status: 'pending',
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', verificationId);

    if (updateError) {
      console.error('❌ Failed to update verification:', updateError);
    }

    return NextResponse.json({
      success: true,
      client_secret: verificationSession.client_secret,
      verification_session_id: verificationSession.id,
      url: verificationSession.url,
    });

  } catch (error: unknown) {
    console.error('❌ Error creating standalone verification session:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create verification session' },
      { status: 500 }
    );
  }
}
