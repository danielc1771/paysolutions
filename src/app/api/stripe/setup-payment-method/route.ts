import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { loanId, customerEmail, customerName } = await request.json();

    console.log('🔧 Setting up payment method for loan:', loanId);

    if (!loanId || !customerEmail) {
      return NextResponse.json(
        { error: 'Loan ID and customer email are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get loan details
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        loan_number,
        borrower:borrowers(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('❌ Error fetching loan:', loanError);
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Create or get Stripe customer
    let customer;
    
    // First, try to find existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: customerEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log('✅ Found existing Stripe customer:', customer.id);
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName || (() => {
          const borrower = Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower;
          return borrower ? `${borrower.first_name} ${borrower.last_name}` : 'Unknown';
        })(),
        metadata: {
          loanId: loanId,
          borrowerId: (() => {
            const borrower = Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower;
            return borrower?.id || '';
          })(),
        },
      });
      console.log('✅ Created new Stripe customer:', customer.id);
    }

    // Create setup intent for saving payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session', // For future payments
      metadata: {
        loanId: loanId,
        loanNumber: loan.loan_number,
        purpose: 'auto_billing_setup',
      },
    });

    console.log('✅ Created setup intent:', setupIntent.id);

    // Store the Stripe customer ID in the borrower record
    await supabase
      .from('borrowers')
      .update({ stripe_customer_id: customer.id })
      .eq('id', (() => {
        const borrower = Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower;
        return borrower?.id || '';
      })());

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
      setupIntentId: setupIntent.id,
    });

  } catch (error) {
    console.error('💥 Error setting up payment method:', error);
    return NextResponse.json(
      { 
        error: 'Failed to setup payment method',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
