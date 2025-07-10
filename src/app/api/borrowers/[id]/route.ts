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
          weekly_payment,
          interest_rate,
          term_weeks
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    if (!id) {
      return NextResponse.json({ error: 'Borrower ID is required' }, { status: 400 });
    }

    // First check if the borrower exists and has any loans
    const { data: borrower, error: fetchError } = await supabase
      .from('borrowers')
      .select(`
        id,
        first_name,
        last_name,
        loans(id, status)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching borrower for deletion:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch borrower details' },
        { status: 500 }
      );
    }

    if (!borrower) {
      return NextResponse.json(
        { error: 'Borrower not found' },
        { status: 404 }
      );
    }

    // Check if borrower has any active loans
    const activeLoans = borrower.loans?.filter(loan => 
      loan.status === 'active' || loan.status === 'funded'
    );

    if (activeLoans && activeLoans.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete borrower with active loans',
          details: `Borrower has ${activeLoans.length} active loan(s). Please close or transfer the loans before deletion.`
        },
        { status: 400 }
      );
    }

    // Delete the borrower (this will cascade delete loans due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('borrowers')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting borrower:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete borrower' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Borrower deleted successfully',
      deleted_borrower: {
        id: borrower.id,
        name: `${borrower.first_name} ${borrower.last_name}`
      }
    });

  } catch (error) {
    console.error('Server error during deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}