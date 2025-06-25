import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';
import { generatePaymentSchedule, storePaymentSchedule, type LoanForSchedule } from '@/utils/payment-schedule';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(request: NextRequest) {
  try {
    const { setupIntentId, paymentMethodId } = await request.json();

    console.log('💳 Completing payment setup:', { setupIntentId, paymentMethodId });

    if (!setupIntentId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get setup intent details from Stripe
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    
    if (!setupIntent.customer || !setupIntent.metadata?.loan_id) {
      return NextResponse.json(
        { error: 'Invalid setup intent' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const loanId = setupIntent.metadata.loan_id;

    // Get loan details
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:borrowers(*)
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

    // Update borrower with payment method
    const { error: updateError } = await supabase
      .from('borrowers')
      .update({
        stripe_payment_method_id: paymentMethodId,
        payment_setup_completed: true,
        payment_setup_completed_at: new Date().toISOString()
      })
      .eq('id', loan.borrower.id);

    if (updateError) {
      console.error('❌ Error updating borrower:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment information' },
        { status: 500 }
      );
    }

    // Generate and store payment schedule
    let paymentSchedule;
    try {
      const loanForSchedule: LoanForSchedule = {
        id: loan.id,
        principal_amount: loan.principal_amount,
        interest_rate: loan.interest_rate,
        term_months: loan.term_months,
        monthly_payment: loan.monthly_payment,
        funding_date: loan.funding_date,
        created_at: loan.created_at
      };
      
      paymentSchedule = generatePaymentSchedule(loanForSchedule);
      await storePaymentSchedule(loan.id, paymentSchedule);
      console.log('✅ Payment schedule generated and stored');
    } catch (scheduleError) {
      console.error('⚠️ Failed to generate/store payment schedule:', scheduleError);
      // Continue with basic subscription if schedule generation fails
    }

    // Create subscription schedule for recurring payments
    try {
      if (paymentSchedule && paymentSchedule.length > 0) {
        // Create a product first for the subscription schedule
        const product = await stripe.products.create({
          name: `Loan Payment - ${loan.loan_number}`,
          description: `Monthly payment for loan ${loan.loan_number}`,
        });

        // Create a price for the product
        const price = await stripe.prices.create({
          currency: 'usd',
          unit_amount: Math.round(parseFloat(loan.monthly_payment) * 100),
          recurring: { interval: 'month' },
          product: product.id,
        });

        // Create subscription schedule with the price
        const subscriptionSchedule = await stripe.subscriptionSchedules.create({
          customer: setupIntent.customer as string,
          start_date: Math.floor(new Date(paymentSchedule[0].dueDate).getTime() / 1000),
          end_behavior: 'cancel',
          phases: [{
            items: [{
              price: price.id,
            }],
            iterations: paymentSchedule.length,
          }],
          default_settings: {
            default_payment_method: paymentMethodId,
            collection_method: 'charge_automatically',
            billing_cycle_anchor: 'phase_start',
          },
          metadata: {
            loan_id: loan.id,
            loan_number: loan.loan_number,
            borrower_id: loan.borrower.id,
            payment_type: 'scheduled_loan_payment'
          },
        });

        // Update loan with subscription schedule ID
        await supabase
          .from('loans')
          .update({
            stripe_subscription_schedule_id: subscriptionSchedule.id,
            stripe_product_id: product.id,
            stripe_price_id: price.id,
            payment_collection_active: true,
            payment_collection_started_at: new Date().toISOString()
          })
          .eq('id', loan.id);

        console.log('✅ Subscription schedule created:', subscriptionSchedule.id);

      } else {
        // Fallback to basic subscription if no schedule available
        const subscription = await stripe.subscriptions.create({
          customer: setupIntent.customer as string,
          items: [{
            price_data: {
              currency: 'usd',
              unit_amount: Math.round(parseFloat(loan.monthly_payment) * 100), // Convert to cents
              product: `Loan Payment - ${loan.loan_number}`,
              recurring: {
                interval: 'month',
              },
            },
          }],
          default_payment_method: paymentMethodId,
          metadata: {
            loan_id: loan.id,
            loan_number: loan.loan_number,
            borrower_id: loan.borrower.id,
            payment_type: 'basic_loan_payment'
          },
          // Start the subscription from the next month
          billing_cycle_anchor: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
        });

        // Update loan with subscription ID
        await supabase
          .from('loans')
          .update({
            stripe_subscription_id: subscription.id,
            payment_collection_active: true,
            payment_collection_started_at: new Date().toISOString()
          })
          .eq('id', loan.id);

        console.log('✅ Basic subscription created:', subscription.id);
      }

    } catch (subscriptionError) {
      console.error('⚠️ Failed to create subscription/schedule:', subscriptionError);
      // Don't fail the entire request - payment method is still saved
    }

    console.log('✅ Payment setup completed for loan:', loan.loan_number);

    return NextResponse.json({
      success: true,
      message: 'Payment setup completed successfully',
      loanId: loan.id,
      paymentMethodId,
      hasPaymentSchedule: !!paymentSchedule
    });

  } catch (error: any) {
    console.error('❌ Payment setup completion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete payment setup' },
      { status: 500 }
    );
  }
}
