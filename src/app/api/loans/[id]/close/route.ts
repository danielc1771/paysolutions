import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';
import { getClosureReasonLabel } from '@/constants/derogatory';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const body = await request.json();
    const { reason, customReason, waiveBalance = false } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    if (reason === 'other' && !customReason) {
      return NextResponse.json(
        { error: 'Custom reason is required when selecting "Other"' },
        { status: 400 }
      );
    }

    console.log('🔒 Starting loan closure process for loan:', loanId);

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get loan with borrower info
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:borrowers(
          id,
          first_name,
          last_name,
          email,
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

    // Check if loan is already closed
    if (loan.status === 'closed') {
      return NextResponse.json(
        { error: 'Loan is already closed' },
        { status: 400 }
      );
    }

    // Check if loan is derogatory or settled
    if (loan.status === 'derogatory' || loan.status === 'settled') {
      return NextResponse.json(
        { error: 'Cannot close derogatory or settled loans. Use appropriate status for these.' },
        { status: 400 }
      );
    }

    const borrower = Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower;
    if (!borrower || !borrower.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Borrower or Stripe customer not found' },
        { status: 404 }
      );
    }

    console.log('✅ Loan validation passed, proceeding with Stripe operations');

    // Step 1: Fetch all invoices for this loan
    const allInvoices = await stripe.invoices.list({
      customer: borrower.stripe_customer_id,
      limit: 100,
    });

    const loanInvoices = allInvoices.data.filter(
      inv => inv.metadata?.loan_id === loanId
    );

    console.log(`📄 Found ${loanInvoices.length} invoices for loan ${loan.loan_number}`);

    // Step 2: Cancel/void all existing invoices
    let voidedCount = 0;
    let deletedCount = 0;

    for (const invoice of loanInvoices) {
      try {
        if (invoice.status === 'open') {
          // Void open invoices
          await stripe.invoices.voidInvoice(invoice.id);
          voidedCount++;
          console.log(`✅ Voided open invoice ${invoice.id}`);
        } else if (invoice.status === 'draft') {
          // Delete draft invoices
          await stripe.invoices.del(invoice.id);
          deletedCount++;
          console.log(`✅ Deleted draft invoice ${invoice.id}`);
        }
      } catch (error) {
        console.error(`⚠️ Failed to cancel invoice ${invoice.id}:`, error);
        // Continue with other invoices even if one fails
      }
    }

    console.log(`✅ Cancelled ${voidedCount} open invoices and ${deletedCount} draft invoices`);

    // Step 3: Calculate remaining balance (if not waiving)
    let finalInvoice;
    let remainingBalance = 0;

    if (!waiveBalance) {
      const weeklyPayment = parseFloat(loan.weekly_payment);
      const termWeeks = loan.term_weeks;
      
      // Count how many payments have been made (paid invoices)
      const paidInvoices = loanInvoices.filter(inv => inv.status === 'paid');
      const paymentsMade = paidInvoices.length;
      const paymentsRemaining = Math.max(0, termWeeks - paymentsMade);
      
      // Calculate remaining balance
      const remainingPaymentsAmount = paymentsRemaining * weeklyPayment * 100; // in cents
      remainingBalance = Math.round(remainingPaymentsAmount);

      console.log(`💰 Remaining balance calculation:
        - Payments made: ${paymentsMade}
        - Payments remaining: ${paymentsRemaining}
        - Weekly payment: $${weeklyPayment}
        - Total remaining: $${remainingBalance / 100}
      `);

      // Step 4: Create final invoice if there's a balance
      if (remainingBalance > 0) {
        finalInvoice = await stripe.invoices.create({
          customer: borrower.stripe_customer_id,
          collection_method: 'send_invoice',
          days_until_due: 30, // 30 days to pay
          auto_advance: true,
          metadata: {
            loan_id: loanId,
            loan_number: loan.loan_number,
            borrower_id: borrower.id,
            is_closure_final_balance: 'true',
            closure_reason: reason === 'other' ? customReason : getClosureReasonLabel(reason),
            original_term_weeks: termWeeks.toString(),
            payments_made: paymentsMade.toString(),
            payments_remaining: paymentsRemaining.toString(),
          },
          description: `Final Balance Due - Loan ${loan.loan_number} (Closed)`,
        });

        // Add line item for remaining balance
        await stripe.invoices.addLines(finalInvoice.id, {
          lines: [
            {
              description: `Remaining Balance - ${paymentsRemaining} payments @ $${weeklyPayment}/week`,
              amount: remainingBalance,
              metadata: {
                loan_id: loanId,
                type: 'closure_final_balance',
              },
            },
          ],
        });

        // Finalize the invoice
        await stripe.invoices.finalizeInvoice(finalInvoice.id);

        console.log(`✅ Created final balance invoice ${finalInvoice.id} for $${remainingBalance / 100}`);
      }
    } else {
      console.log('✅ Balance waived - no final invoice created');
    }

    // Step 5: Update loan record
    const closureReason = reason === 'other' ? customReason : getClosureReasonLabel(reason);
    
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        status: 'closed',
        closure_reason: closureReason,
        closure_date: new Date().toISOString(),
        closed_by: user.id,
        remaining_balance: waiveBalance ? '0' : (remainingBalance / 100).toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId);

    if (updateError) {
      console.error('❌ Error updating loan record:', updateError);
      return NextResponse.json(
        { error: 'Failed to update loan record' },
        { status: 500 }
      );
    }

    console.log('✅ Loan closed successfully');

    // TODO: Send email notification to borrower (Phase 8)
    // This would include:
    // - Notification of loan closure
    // - Reason for closure
    // - Final balance amount (if any)
    // - Link to final invoice (if created)
    // - Thank you message

    return NextResponse.json({
      success: true,
      message: `Loan ${loan.loan_number} has been closed`,
      data: {
        loan_id: loanId,
        loan_number: loan.loan_number,
        reason: closureReason,
        invoices_voided: voidedCount,
        invoices_deleted: deletedCount,
        balance_waived: waiveBalance,
        remaining_balance: waiveBalance ? 0 : remainingBalance / 100,
        final_invoice_id: finalInvoice?.id,
        final_invoice_url: finalInvoice?.hosted_invoice_url,
      },
    });

  } catch (error) {
    console.error('💥 Error closing loan:', error);
    return NextResponse.json(
      {
        error: 'Failed to close loan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
