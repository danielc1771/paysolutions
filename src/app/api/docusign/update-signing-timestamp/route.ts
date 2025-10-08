import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/docusign/update-signing-timestamp
 *
 * Updates the appropriate signing timestamp based on the three-stage signing workflow:
 * 1. iPay Admin signs first -> updates ipay_signed_at
 * 2. Organization Owner signs second -> updates organization_signed_at
 * 3. Borrower signs last -> updates borrower_signed_at
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { envelopeId } = await request.json();

    if (!envelopeId) {
      return NextResponse.json(
        { success: false, error: 'Envelope ID is required' },
        { status: 400 }
      );
    }
    

    // Find the loan by envelope ID
    const { data: loan } = await supabase
      .from('loans')
      .select(
        `
          id,
          ipay_signed_at,
          organization_signed_at,
          borrower_signed_at,
          status
        `
      )
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (!loan) {
      return NextResponse.json(
        { success: false, error: 'Loan not found for this envelope' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    let signerType: 'ipay' | 'organization' | 'borrower' | null = null;

    // Determine which signer just completed based on which timestamps are empty
    // Order: iPay -> Organization -> Borrower
    if (!loan.ipay_signed_at) {
      // iPay Admin is the first signer
      await supabase
        .from('loans')
        .update({
          ipay_signed_at: now,
          status: 'ipay_approved'
        })
        .eq('id', loan.id);

      signerType = 'ipay';
    } else if (!loan.organization_signed_at) {
      // Organization Owner is the second signer
      await supabase
        .from('loans')
        .update({
          organization_signed_at: now,
          status: 'dealer_approved'
        })
        .eq('id', loan.id);

      signerType = 'organization';
    } else if (!loan.borrower_signed_at) {
      // Borrower is the final signer
      await supabase
        .from('loans')
        .update({
          borrower_signed_at: now,
          status: 'fully_signed'
        })
        .eq('id', loan.id);

      signerType = 'borrower';
    } else {
      // All signatures already recorded
      return NextResponse.json(
        { success: false, error: 'All signatures already recorded for this loan' },
        { status: 400 }
      );
    }

    console.log(`✅ Updated ${signerType} signing timestamp for loan ${loan.id}`);

    return NextResponse.json({
      success: true,
      signerType,
      loanId: loan.id,
      timestamp: now
    });

  } catch (error) {
    console.error('Error updating signing timestamp:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update signing timestamp' },
      { status: 500 }
    );
  }
}
