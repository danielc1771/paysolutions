import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, loanId, verificationId, returnUrl } = body;

    // Determine if this is a loan verification or standalone verification
    const isStandaloneVerification = !!verificationId;

    console.log('🚀 Creating verification session:', {
      type: isStandaloneVerification ? 'standalone' : 'loan',
      id: isStandaloneVerification ? verificationId : loanId,
    });

    // Build metadata based on verification type
    const metadata: Record<string, string> = {
      domain: request.headers.get('host') || 'unknown',
      created_at: new Date().toISOString(),
    };

    if (isStandaloneVerification) {
      metadata.verification_id = verificationId;
      metadata.type = 'standalone_verification';
    } else {
      metadata.loan_id = loanId;
      metadata.first_name = firstName || '';
      metadata.last_name = lastName || '';
      metadata.type = 'loan_verification';
    }

    // For standalone verifications, get the person's info from the database
    let verificationEmail = email;
    if (isStandaloneVerification && !email) {
      const supabase = await createClient();
      const { data: verification } = await supabase
        .from('verifications')
        .select('email, first_name, last_name')
        .eq('id', verificationId)
        .single();

      if (verification) {
        verificationEmail = verification.email;
        metadata.first_name = verification.first_name;
        metadata.last_name = verification.last_name;
      }
    }

    // Create the verification session with selfie check
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      provided_details: {
        email: verificationEmail,
      },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      metadata,
      return_url: returnUrl || undefined,
    });

    console.log('✅ Created verification session:', {
      sessionId: verificationSession.id,
      type: isStandaloneVerification ? 'standalone' : 'loan',
      status: verificationSession.status,
      url: verificationSession.url,
    });

    // For standalone verifications, update the database with the session ID
    if (isStandaloneVerification) {
      const supabase = await createClient();
      await supabase
        .from('verifications')
        .update({
          stripe_verification_session_id: verificationSession.id,
          stripe_verification_status: 'pending',
          status: 'in_progress',
        })
        .eq('id', verificationId);
    }

    // Return response - include URL for standalone verifications (redirect flow)
    return NextResponse.json({
      success: true,
      client_secret: verificationSession.client_secret,
      verification_session_id: verificationSession.id,
      url: verificationSession.url, // For redirect-based flow
    });

  } catch (error: unknown) {
    console.error('❌ Error creating verification session:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create verification session' },
      { status: 500 }
    );
  }
}