import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { loans, borrowers } from '@/drizzle/schema/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { loanId } = await request.json();
    const supabase = await createClient();

    // Update the loan's stripeVerificationStatus to 'verified'
    const { data: loan, error: loanUpdateError } = await supabase
      .from('loans')
      .update({ stripe_verification_status: 'verified' })
      .eq('id', loanId)
      .select('borrower_id')
      .single();

    if (loanUpdateError) {
      console.error(`Error updating loan ${loanId} verification status:`, loanUpdateError);
      return NextResponse.json({ error: 'Failed to update loan verification status' }, { status: 500 });
    }

    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Update the borrower's kycStatus to 'verified'
    const { error: borrowerUpdateError } = await supabase
      .from('borrowers')
      .update({ kyc_status: 'verified' })
      .eq('id', loan.borrower_id);

    if (borrowerUpdateError) {
      console.error(`Error updating borrower ${loan.borrower_id} KYC status:`, borrowerUpdateError);
      return NextResponse.json({ error: 'Failed to update borrower KYC status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Verification skipped and status updated.' });
  } catch (error) {
    console.error('Error in skip-verification API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
