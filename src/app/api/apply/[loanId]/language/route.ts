import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ loanId: string }> }
) {
  try {
    const { language } = await request.json();
    const { loanId } = await params;

    if (!language || !['en', 'es'].includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language. Must be "en" or "es"' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the loan to find the borrower
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('borrower_id')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Update the borrower's preferred language
    const { error: updateError } = await supabase
      .from('borrowers')
      .update({ 
        preferred_language: language,
        updated_at: new Date().toISOString()
      })
      .eq('id', loan.borrower_id);

    if (updateError) {
      console.error('Error updating language preference:', updateError);
      return NextResponse.json(
        { error: 'Failed to save language preference' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}