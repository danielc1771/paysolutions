import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key (bypasses RLS)
const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    const body = await request.json();
    const {
      borrower_id,
      principal_amount,
      interest_rate,
      term_months,
      monthly_payment,
      purpose,
      collateral_description,
    } = body;

    // Validate required fields
    if (!borrower_id || !principal_amount || !interest_rate || !term_months || !monthly_payment || !purpose) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify borrower exists
    const { data: borrower, error: borrowerError } = await supabase
      .from('borrowers')
      .select('id')
      .eq('id', borrower_id)
      .single();

    if (borrowerError || !borrower) {
      return NextResponse.json(
        { error: 'Borrower not found' },
        { status: 404 }
      );
    }

    // Generate loan number
    const loanNumber = `PSL${Date.now()}`;

    // Create new loan
    const { data: loan, error } = await supabase
      .from('loans')
      .insert({
        loan_number: loanNumber,
        borrower_id,
        principal_amount,
        interest_rate,
        term_months,
        monthly_payment,
        purpose,
        collateral_description,
        status: 'new', // Default status
        remaining_balance: principal_amount, // Initially equals principal
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating loan:', error);
      return NextResponse.json(
        { error: 'Failed to create loan' },
        { status: 500 }
      );
    }

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    const { data: loans, error } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:borrowers(
          first_name,
          last_name,
          email,
          kyc_status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching loans:', error);
      return NextResponse.json(
        { error: 'Failed to fetch loans' },
        { status: 500 }
      );
    }

    return NextResponse.json(loans);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
