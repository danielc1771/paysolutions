import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: loanId } = await params;

    if (!loanId) {
      return NextResponse.json(
        { error: 'Loan ID is required' },
        { status: 400 }
      );
    }

    // Fetch loan details for summary with borrower relationship
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        loan_number,
        principal_amount,
        interest_rate,
        term_weeks,
        weekly_payment,
        funding_date,
        status,
        created_at,
        borrower:borrowers(
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', loanId)
      .single();

    if (loanError) {
      console.error('Error fetching loan:', loanError);
      return NextResponse.json(
        { error: 'Failed to fetch loan details' },
        { status: 500 }
      );
    }

    if (!loan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Transform the data to match expected interface
    const transformedLoan = {
      ...loan,
      borrower_name: (() => {
        const borrower = Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower;
        return borrower ? `${borrower.first_name} ${borrower.last_name}` : 'Unknown';
      })(),
      borrower: Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower
    };

    // Return loan summary data
    return NextResponse.json(transformedLoan);

  } catch (error) {
    console.error('Error in loan summary API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
