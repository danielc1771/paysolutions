import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, loanId } = body;

    console.log('🚀 Creating verification session for loan:', loanId);
    console.log('📝 Request details:', {
      email,
      firstName,
      lastName,
      loanId,
      domain: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer')
    });
    
    // Create the verification session
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document',
      provided_details: {
        email: email,
      },
      metadata: {
        loan_id: loanId,
        first_name: firstName,
        last_name: lastName,
        domain: request.headers.get('host') || 'unknown',
        created_at: new Date().toISOString()
      },
    });

    console.log('✅ Created verification session:', {
      sessionId: verificationSession.id,
      loanId,
      status: verificationSession.status,
      url: verificationSession.url,
      clientSecret: verificationSession.client_secret ? '***provided***' : 'missing'
    });

    // Return only the client secret to the frontend
    return NextResponse.json({
      client_secret: verificationSession.client_secret,
      verification_session_id: verificationSession.id,
    });

  } catch (error: unknown) {
    console.error('❌ Error creating verification session:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      apiVersion: '2025-06-30.basil'
    });
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create verification session' },
      { status: 500 }
    );
  }
}