import { createClient } from '@/utils/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch borrower with their loans
    const { data: borrower, error } = await supabase
      .from('borrowers')
      .select(`
        *,
        loans(
          id,
          loan_number,
          principal_amount,
          status,
          created_at,
          monthly_payment,
          interest_rate,
          term_months
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching borrower:', error);
      return NextResponse.json(
        { error: 'Failed to fetch borrower' },
        { status: 500 }
      );
    }

    if (!borrower) {
      return NextResponse.json(
        { error: 'Borrower not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ borrower });
  } catch (error) {
    console.error('Error in borrower API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}