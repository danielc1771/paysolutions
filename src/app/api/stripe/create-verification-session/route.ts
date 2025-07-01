import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, loanId } = body;

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
      },
    });

    // Return only the client secret to the frontend
    return NextResponse.json({
      client_secret: verificationSession.client_secret,
      verification_session_id: verificationSession.id,
    });

  } catch (error: any) {
    console.error('Error creating verification session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create verification session' },
      { status: 500 }
    );
  }
}