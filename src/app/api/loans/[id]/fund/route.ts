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

    // Verify loan is ready for funding
    if (loan.docusign_status !== 'signed') {
      return NextResponse.json(
        { error: 'Loan must be signed before funding' },
        { status: 400 }
      );
    }

    if (loan.status === 'funded') {
      return NextResponse.json(
        { error: 'Loan is already funded' },
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

    // Check if this is a setup intent confirmation or initial funding request
    const body = await request.json().catch(() => ({}));
    const { setup_intent_id, confirm_funding } = body;

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

    // If this is not a confirmation request, create setup intent for payment method collection
    if (!confirm_funding) {
      console.log('🔧 Creating setup intent for payment method collection');
      
      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomer.id,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: {
          loan_id: loanId,
          loan_number: loan.loan_number,
          borrower_id: borrower.id,
          purpose: 'loan_funding_setup',
        },
      });

      console.log('✅ Setup intent created:', setupIntent.id);

      return NextResponse.json({
        requires_payment_method: true,
        setup_intent: {
          id: setupIntent.id,
          client_secret: setupIntent.client_secret,
        },
        customer_id: stripeCustomer.id,
        loan_details: {
          loan_number: loan.loan_number,
          weekly_payment: parseFloat(loan.weekly_payment),
          total_payments: loan.term_weeks,
          borrower_name: `${borrower.first_name} ${borrower.last_name}`,
        },
      });
    }

    // Continue with funding process after payment method is confirmed
    console.log('✅ Payment method confirmed, proceeding with loan funding');

    // Verify setup intent was successful
    if (setup_intent_id) {
      const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);
      
      if (setupIntent.status !== 'succeeded') {
        return NextResponse.json(
          { error: 'Payment method setup failed' },
          { status: 400 }
        );
      }

      // Set the payment method as default for the customer
      if (setupIntent.payment_method) {
        await stripe.customers.update(stripeCustomer.id, {
          invoice_settings: {
            default_payment_method: setupIntent.payment_method as string,
          },
        });
        console.log('✅ Default payment method set for customer');
      }
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

    // Step 4: Create Stripe subscription with immediate billing
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [
        {
          price: price.id,
        },
      ],
      metadata: {
        loan_id: loanId,
        loan_number: loan.loan_number,
        borrower_id: borrower.id,
        total_payments: loan.term_weeks.toString(),
      },
      // Start billing immediately, then weekly
      collection_method: 'charge_automatically',
      description: `Weekly payments for loan ${loan.loan_number}`,
      expand: ['latest_invoice.payment_intent'],
    });

    console.log('✅ Created Stripe subscription:', subscription.id);

    // Step 5: Process the first payment (subscription creates first invoice automatically)
    const latestInvoice = subscription.latest_invoice as Stripe.Invoice & {
      payment_intent?: Stripe.PaymentIntent | string;
    };
    let firstPaymentStatus = 'pending';
    
    if (latestInvoice && latestInvoice.payment_intent) {
      // payment_intent can be a string ID or expanded PaymentIntent object
      const paymentIntentData = latestInvoice.payment_intent;
      
      if (typeof paymentIntentData === 'string') {
        // If it's just an ID, we need to retrieve the full object
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentData);
        
        if (paymentIntent.status === 'succeeded') {
          firstPaymentStatus = 'succeeded';
          console.log('✅ First payment processed successfully:', paymentIntent.id);
        } else if (paymentIntent.status === 'requires_action') {
          console.log('⚠️ First payment requires additional action:', paymentIntent.id);
          firstPaymentStatus = 'requires_action';
        } else {
          console.log('❌ First payment failed:', paymentIntent.status);
          firstPaymentStatus = 'failed';
        }
      } else {
        // It's already an expanded PaymentIntent object
        const paymentIntent = paymentIntentData as Stripe.PaymentIntent;
        
        if (paymentIntent.status === 'succeeded') {
          firstPaymentStatus = 'succeeded';
          console.log('✅ First payment processed successfully:', paymentIntent.id);
        } else if (paymentIntent.status === 'requires_action') {
          console.log('⚠️ First payment requires additional action:', paymentIntent.id);
          firstPaymentStatus = 'requires_action';
        } else {
          console.log('❌ First payment failed:', paymentIntent.status);
          firstPaymentStatus = 'failed';
        }
      }
    }

    // Step 6: Update loan record with Stripe information
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        stripe_subscription_id: subscription.id,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        status: firstPaymentStatus === 'succeeded' ? 'funded' : 'payment_failed',
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

    // Step 7: Get payment schedule to sync with our database
    const { data: paymentSchedules } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_number');

    const firstPaymentId = latestInvoice?.payment_intent ? 
      (typeof latestInvoice.payment_intent === 'string' ? 
        latestInvoice.payment_intent : 
        (latestInvoice.payment_intent as Stripe.PaymentIntent).id
      ) : 
      null;

    console.log('✅ Loan funding completed successfully', {
      loanId,
      customerId: stripeCustomer.id,
      subscriptionId: subscription.id,
      firstPaymentId,
      firstPaymentStatus,
      scheduledPayments: paymentSchedules?.length || 0,
    });

    return NextResponse.json({
      success: true,
      message: firstPaymentStatus === 'succeeded' ? 
        'Loan funded successfully and first payment processed!' : 
        'Loan created but first payment failed',
      data: {
        loan_id: loanId,
        stripe_customer_id: stripeCustomer.id,
        stripe_subscription_id: subscription.id,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        first_payment_intent_id: firstPaymentId,
        first_payment_status: firstPaymentStatus,
        weekly_payment_amount: parseFloat(loan.weekly_payment),
        total_payments: loan.term_weeks,
        next_payment_date: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
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