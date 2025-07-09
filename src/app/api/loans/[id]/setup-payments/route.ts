import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-05-28.basil',
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    console.log('💳 Setting up payments for loan:', id);

    // Get loan and borrower data
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:borrowers(*)
      `)
      .eq('id', id)
      .single();

    if (loanError || !loan) {
      console.error('❌ Error fetching loan:', loanError);
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Create or get Stripe customer
    let customerId = loan.borrower.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: loan.borrower.email,
        name: `${loan.borrower.first_name} ${loan.borrower.last_name}`,
        phone: loan.borrower.phone,
        address: {
          line1: loan.borrower.address_line1,
          city: loan.borrower.city,
          state: loan.borrower.state,
          postal_code: loan.borrower.zip_code,
          country: 'US',
        },
        metadata: {
          borrower_id: loan.borrower.id,
          loan_id: loan.id,
        },
      });

      customerId = customer.id;

      // Update borrower with Stripe customer ID
      await supabase
        .from('borrowers')
        .update({ stripe_customer_id: customerId })
        .eq('id', loan.borrower.id);
    }

    // Create setup intent for payment method collection
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        loan_id: loan.id,
        loan_number: loan.loan_number,
      },
    });

    console.log('✅ Payment setup created for loan:', loan.loan_number);
    console.log('Setup Intent Client Secret:', setupIntent.client_secret);
    console.log('Setup Intent ID:', setupIntent.id);

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const setupUrl = new URL('/payment-setup', baseUrl);
    setupUrl.searchParams.set('setup_intent', setupIntent.client_secret || '');

    console.log('Redirecting to setup URL:', setupUrl.href);

    return NextResponse.json({
      success: true,
      message: 'Payment setup initiated',
      setupUrl: setupUrl.href,
      clientSecret: setupIntent.client_secret,
      customerId
    });

  } catch (error: unknown) {
    console.error('❌ Payment setup error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to setup payments' },
      { status: 500 }
    );
  }
}
