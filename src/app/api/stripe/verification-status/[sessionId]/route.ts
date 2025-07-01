import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function GET(
  request: Request, 
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = await params;

    // Retrieve the verification session from Stripe
    const verificationSession = await stripe.identity.verificationSessions.retrieve(sessionId);

    return NextResponse.json({
      status: verificationSession.status,
      last_error: verificationSession.last_error,
      verified_outputs: verificationSession.verified_outputs,
    });

  } catch (error: any) {
    console.error('Error retrieving verification session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve verification session' },
      { status: 500 }
    );
  }
}