import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getPaymentSchedule } from '@/utils/payment-schedule';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: loanId } = await params;

    console.log('📊 Payment schedule API called for loan:', loanId);

    if (!loanId) {
      console.error('❌ No loan ID provided');
      return NextResponse.json(
        { error: 'Loan ID is required' },
        { status: 400 }
      );
    }

    // First verify the loan exists
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, status, loan_number')
      .eq('id', loanId)
      .single();

    if (loanError) {
      console.error('❌ Error fetching loan:', loanError);
      return NextResponse.json(
        { error: 'Failed to fetch loan details' },
        { status: 500 }
      );
    }

    if (!loan) {
      console.error('❌ Loan not found:', loanId);
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    console.log('✅ Loan found:', loan.loan_number, 'Status:', loan.status);

    // Get the payment schedule using the utility function (with fallback generation)
    const paymentSchedule = await getPaymentSchedule(loanId);

    if (!paymentSchedule || paymentSchedule.length === 0) {
      console.warn('⚠️ No payment schedule generated for loan:', loanId);
      return NextResponse.json(
        { error: 'Payment schedule could not be generated' },
        { status: 404 }
      );
    }

    console.log('✅ Payment schedule retrieved:', paymentSchedule.length, 'payments');
    return NextResponse.json(paymentSchedule);

  } catch (error) {
    console.error('💥 Error in payment schedule API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
