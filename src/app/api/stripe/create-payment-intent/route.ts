import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const { loanId, amount, borrowerEmail } = await request.json();

    // Validate input
    if (!loanId || !amount || !borrowerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: loanId, amount, borrowerEmail' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify loan exists and get borrower info
    const supabase = await createClient();
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        loan_number,
        principal_amount,
        borrower:borrowers(*)
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Verify borrower email matches
    if (loan.borrower.email !== borrowerEmail) {
      return NextResponse.json(
        { error: 'Borrower email mismatch' },
        { status: 403 }
      );
    }

    // Check if Stripe keys are configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        clientSecret: 'demo_client_secret',
        paymentIntentId: 'demo_payment_intent_id',
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        isDemo: true,
        message: 'Demo mode: Stripe keys not configured'
      });
    }

    // Initialize Stripe with real keys
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Create real payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        loanId,
        borrowerEmail,
        loanNumber: loan.loan_number,
        paymentType: 'extra_payment'
      },
      description: `Extra payment for loan ${loan.loan_number}`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
