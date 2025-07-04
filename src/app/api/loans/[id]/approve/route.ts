import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    console.log('🔍 Approving loan:', id);

    // Update loan status to 'funded'
    const { data: loan, error } = await supabase
      .from('loans')
      .update({ 
        status: 'funded',
        funding_date: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error approving loan:', error);
      return NextResponse.json(
        { error: 'Failed to approve loan' },
        { status: 500 }
      );
    }

    console.log('✅ Loan approved successfully:', loan.loan_number);

    return NextResponse.json({
      success: true,
      message: 'Loan approved successfully',
      loan
    });

  } catch (error: unknown) {
    console.error('❌ Loan approval error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve loan' },
      { status: 500 }
    );
  }
}
