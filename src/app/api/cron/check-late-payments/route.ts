import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function GET() {
  try {
    console.log('🔍 Starting late payment check...');

    const supabase = await createClient();

    // Get all active/funded loans that aren't already derogatory or closed
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select(`
        id,
        loan_number,
        status,
        borrower:borrowers(
          stripe_customer_id
        )
      `)
      .in('status', ['funded', 'active'])
      .eq('derogatory_status', false);

    if (loansError) {
      console.error('❌ Error fetching loans:', loansError);
      return NextResponse.json(
        { error: 'Failed to fetch loans' },
        { status: 500 }
      );
    }

    if (!loans || loans.length === 0) {
      console.log('✅ No active loans to check');
      return NextResponse.json({
        success: true,
        message: 'No active loans to check',
        checked: 0,
        late: 0,
        onTime: 0,
      });
    }

    console.log(`📊 Checking ${loans.length} active loans...`);

    let lateCount = 0;
    let onTimeCount = 0;
    const now = Math.floor(Date.now() / 1000);

    for (const loan of loans) {
      try {
        const borrower = Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower;
        
        if (!borrower?.stripe_customer_id) {
          console.log(`⚠️  Loan ${loan.loan_number} has no Stripe customer, skipping`);
          continue;
        }

        // Fetch invoices for this loan
        const invoices = await stripe.invoices.list({
          customer: borrower.stripe_customer_id,
          limit: 100,
        });

        const loanInvoices = invoices.data.filter(
          inv => inv.metadata?.loan_id === loan.id
        );

        // Find overdue invoices (open status and past due date)
        const overdueInvoices = loanInvoices.filter(
          inv => inv.status === 'open' && inv.due_date && inv.due_date < now
        );

        if (overdueInvoices.length > 0) {
          // Calculate days overdue (use the oldest overdue invoice)
          const oldestOverdue = overdueInvoices.reduce((oldest, inv) => 
            (inv.due_date && (!oldest.due_date || inv.due_date < oldest.due_date)) ? inv : oldest
          );

          const daysOverdue = oldestOverdue.due_date 
            ? Math.floor((now - oldestOverdue.due_date) / (24 * 60 * 60))
            : 0;

          // Update loan as late
          await supabase
            .from('loans')
            .update({
              is_late: true,
              days_overdue: daysOverdue,
              last_payment_check: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', loan.id);

          lateCount++;
          console.log(`🚨 Loan ${loan.loan_number} is LATE - ${overdueInvoices.length} overdue invoice(s), ${daysOverdue} days overdue`);
        } else {
          // Update loan as on time
          await supabase
            .from('loans')
            .update({
              is_late: false,
              days_overdue: 0,
              last_payment_check: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', loan.id);

          onTimeCount++;
          console.log(`✅ Loan ${loan.loan_number} is ON TIME`);
        }
      } catch (error) {
        console.error(`❌ Error checking loan ${loan.loan_number}:`, error);
        // Continue with other loans
      }
    }

    console.log(`✅ Late payment check complete. Late: ${lateCount}, On Time: ${onTimeCount}`);

    return NextResponse.json({
      success: true,
      message: `Checked ${loans.length} loans`,
      checked: loans.length,
      late: lateCount,
      onTime: onTimeCount,
    });

  } catch (error) {
    console.error('💥 Error in late payment check:', error);
    return NextResponse.json(
      {
        error: 'Failed to check late payments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
