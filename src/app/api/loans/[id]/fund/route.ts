import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
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

    console.log('✅ Created Stripe product and price');

    // Step 4: Create all invoices upfront with scheduled auto-finalization
    // Stripe will automatically finalize and send each invoice at the specified time
    console.log(`📄 Creating ${loan.term_weeks} invoices with automatic scheduling...`);

    const weeklyPaymentAmount = Math.round(parseFloat(loan.weekly_payment) * 100); // Convert to cents
    const startDate = Math.floor(Date.now() / 1000); // Today
    const invoiceIds: string[] = [];

    for (let week = 1; week <= loan.term_weeks; week++) {
      // Calculate when this invoice should be sent and auto-finalized
      // First invoice: finalize immediately (now)
      // Subsequent invoices: week 2 at +7 days, week 3 at +14 days, etc.
      const finalizeAt = week === 1 ? startDate : startDate + ((week - 1) * 7 * 24 * 60 * 60);

      // Calculate absolute due date 
      const dueDateTimestamp = startDate + ((week * 7) * 24 * 60 * 60);

      // Create invoice as DRAFT with auto-finalize (or finalize immediately for first invoice)
      const invoice = await stripe.invoices.create({
        auto_advance: true,
        customer: stripeCustomer.id,
        collection_method: 'send_invoice',
        due_date: dueDateTimestamp, // Absolute due date timestamp
        automatically_finalizes_at: week === 1 ? startDate : finalizeAt, // First invoice will be manually finalized immediately
        metadata: {
          loan_id: loanId,
          loan_number: loan.loan_number,
          borrower_id: borrower.id,
          payment_number: week.toString(),
          total_payments: loan.term_weeks.toString(),
        },
        description: `Loan ${loan.loan_number} - Payment ${week} of ${loan.term_weeks}`,
      });

      // Add payment line item
      await stripe.invoiceItems.create({
        customer: stripeCustomer.id,
        invoice: invoice.id,
        amount: weeklyPaymentAmount,
        currency: 'usd',
        description: `Weekly Payment ${week}/${loan.term_weeks}`,
        metadata: {
          loan_id: loanId,
          payment_number: week.toString(),
        },
      });

      // Add $5 convenience fee
      await stripe.invoiceItems.create({
        customer: stripeCustomer.id,
        invoice: invoice.id,
        amount: 500, // $5.00 in cents
        currency: 'usd',
        description: 'Convenience Fee',
        metadata: {
          loan_id: loanId,
          payment_number: week.toString(),
          type: 'convenience_fee',
        },
      });

      invoiceIds.push(invoice.id);
    }

    console.log(`✅ Created ${invoiceIds.length} invoices for loan ${loan.loan_number}`);

    // Step 5: Update loan record with Stripe information
    const { error: updateError } = await supabase
      .from('loans')
      .update({
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

    const firstPaymentDate = new Date(startDate * 1000); // First invoice sent immediately
    const secondPaymentDate = loan.term_weeks > 1 ? new Date((startDate + (7 * 24 * 60 * 60)) * 1000) : null;

    return NextResponse.json({
      success: true,
      message: `Loan funded successfully! ${invoiceIds.length} payment invoices created. First payment invoice sent immediately.${secondPaymentDate ? ` Next invoice will be sent on ${secondPaymentDate.toLocaleDateString()}.` : ''}`,
      data: {
        loan_id: loanId,
        stripe_customer_id: stripeCustomer.id,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        invoices_created: invoiceIds.length,
        first_invoice_id: invoiceIds[0],
        first_payment_date: firstPaymentDate.toISOString(),
        second_payment_date: secondPaymentDate?.toISOString(),
        total_payments: loan.term_weeks,
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