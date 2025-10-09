import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});


export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    console.log('🚀 Starting loan funding process for loan:', loanId);

    const supabase = await createClient();

    // Get complete loan and borrower information
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:borrowers(
          id,
          first_name,
          last_name,
          email,
          phone,
          address_line1,
          city,
          state,
          zip_code,
          stripe_customer_id
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

    if (loan.status === 'funded') {
      return NextResponse.json(
        { error: 'Loan is already funded' },
        { status: 400 }
      );
    }

    // Verify loan is ready for funding
    if (loan.status !== 'fully_signed') {
      return NextResponse.json(
        { error: 'Loan must be signed before funding' },
        { status: 400 }
      );
    }

    const borrower = Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower;
    if (!borrower) {
      return NextResponse.json(
        { error: 'Borrower not found' },
        { status: 404 }
      );
    }

    console.log('✅ Loan validation passed, proceeding with Stripe setup');

    // Step 1: Create or get Stripe customer with full billing information
    let stripeCustomer;
    
    if (borrower.stripe_customer_id) {
      // Get existing customer
      try {
        stripeCustomer = await stripe.customers.retrieve(borrower.stripe_customer_id);
        console.log('✅ Found existing Stripe customer:', stripeCustomer.id);
      } catch {
        console.log('⚠️ Existing customer not found, creating new one');
        stripeCustomer = null;
      }
    }

    if (!stripeCustomer) {
      // Create new customer with full billing information
      stripeCustomer = await stripe.customers.create({
        email: borrower.email,
        name: `${borrower.first_name} ${borrower.last_name}`,
        phone: borrower.phone || undefined,
        address: {
          line1: borrower.address_line1 || '',
          city: borrower.city || '',
          state: borrower.state || '',
          postal_code: borrower.zip_code || '',
          country: 'US', // Assuming US for now
        },
        metadata: {
          loan_id: loanId,
          borrower_id: borrower.id,
          loan_number: loan.loan_number,
        },
      });

      console.log('✅ Created new Stripe customer:', stripeCustomer.id);

      // Update borrower with Stripe customer ID
      await supabase
        .from('borrowers')
        .update({ stripe_customer_id: stripeCustomer.id })
        .eq('id', borrower.id);
    }

    // Step 2: Create Stripe product for this loan
    const product = await stripe.products.create({
      name: `Loan ${loan.loan_number} - Weekly Payment`,
      description: `Weekly payment for loan ${loan.loan_number} for ${borrower.first_name} ${borrower.last_name}`,
      metadata: {
        loan_id: loanId,
        loan_number: loan.loan_number,
        borrower_id: borrower.id,
      },
    });

    console.log('✅ Created Stripe product:', product.id);

    // Step 3: Create Stripe price for weekly payments
    const price = await stripe.prices.create({
      currency: 'usd',
      unit_amount: Math.round(parseFloat(loan.weekly_payment) * 100), // Convert to cents
      recurring: {
        interval: 'week',
        interval_count: 1,
      },
      product: product.id,
      metadata: {
        loan_id: loanId,
        loan_number: loan.loan_number,
      },
    });

    console.log('✅ Created Stripe price:', price.id);

    // Step 4: Create Stripe subscription schedule for better control
    const startDate = Math.floor(Date.now() / 1000);
    // TODO: Change to 1 week from now for production: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    
    const subscriptionSchedule = await stripe.subscriptionSchedules.create({
      customer: stripeCustomer.id,
      start_date: startDate,
      end_behavior: 'cancel', // Automatically cancel after all phases complete
      phases: [
        {
          items: [
            {
              price: price.id,
              quantity: 1,
            },
          ],
          iterations: loan.term_weeks, // Number of weekly payments
          metadata: {
            loan_id: loanId,
            loan_number: loan.loan_number,
            borrower_id: borrower.id,
          },
          collection_method: 'send_invoice',
          invoice_settings: {
            days_until_due: 5,
          },
        },
      ],
      metadata: {
        loan_id: loanId,
        loan_number: loan.loan_number,
        borrower_id: borrower.id,
        total_payments: loan.term_weeks.toString(),
      },
    });

    console.log('✅ Created Stripe subscription schedule:', subscriptionSchedule.id);

    // Get the subscription ID from the schedule
    const subscription = subscriptionSchedule.subscription as string;

    console.log('✅ Enabled invoice emails for customer');

    // Step 6: Update loan record with Stripe information
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        stripe_subscription_id: subscription || subscriptionSchedule.id,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        status: 'funded',
        funding_date: new Date().toISOString().split('T')[0], // Today's date
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId);

    if (updateError) {
      console.error('❌ Error updating loan record:', updateError);
      // TODO: Should we rollback Stripe objects here?
      return NextResponse.json(
        { error: 'Failed to update loan record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Loan funded successfully! The borrower will receive an email invoice for their first payment.',
      data: {
        loan_id: loanId,
        stripe_customer_id: stripeCustomer.id,
        stripe_subscription_schedule_id: subscriptionSchedule.id,
        stripe_subscription_id: subscription,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
      },
    });

  } catch (error) {
    console.error('💥 Error funding loan:', error);
    return NextResponse.json(
      {
        error: 'Failed to fund loan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}