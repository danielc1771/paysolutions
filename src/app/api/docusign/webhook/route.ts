import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/docusign/webhook
 *
 * Webhook endpoint for DocuSign to notify us of envelope and recipient events
 *
 * IMPORTANT: This webhook ONLY handles the BORROWER signature.
 * iPay and Organization signatures are handled via the embedded signing redirect
 * to /api/docusign/update-signing-timestamp.
 *
 * When the borrower signs via email (after iPay and Org have signed):
 * - borrower_signed_at timestamp is set
 * - status → 'fully_signed'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📨 DocuSign webhook received');
    console.log('Event:', body.event);
    console.log('Full webhook payload:', JSON.stringify(body, null, 2));

    // Extract envelope information
    const envelopeId = body.data?.envelopeId;
    const event = body.event;

    if (!envelopeId) {
      console.warn('⚠️ Webhook received without envelope ID');
      return NextResponse.json({ received: true });
    }

    const supabase = await createClient();

    // Get the loan with current signing timestamps
    const { data: loan } = await supabase
      .from('loans')
      .select(`
        id,
        ipay_signed_at,
        docusign_completed_at,
        organization_signed_at,
        borrower_signed_at,
        status
      `)
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (!loan) {
      console.warn('⚠️ Loan not found for envelope ID:', envelopeId);
      return NextResponse.json({ received: true });
    }

    // ONLY handle recipient-completed events for the BORROWER (recipientId === '3')
    // (iPay and Organization are handled via embedded signing redirect)
    if (event === 'recipient-completed') {
      const recipientId = body.data?.recipientId || body.data?.recipient?.recipientId;
      const recipientEmail = body.data?.email || body.data?.recipient?.email;
      const completedTime = body.data?.completedTime || body.data?.statusDateTime || new Date().toISOString();

      console.log('👤 Recipient completed:', {
        recipientId,
        email: recipientEmail,
        time: completedTime
      });

      // Only process if this is recipient #3 (the borrower)
      // Recipient 1 = iPay Admin, Recipient 2 = Organization Owner, Recipient 3 = Borrower
      if (recipientId !== '3') {
        console.log(`ℹ️ Ignoring recipient-completed event for recipient ${recipientId} (not the borrower)`);
        return NextResponse.json({ received: true });
      }

      // Double-check that both iPay and Org have already signed
      if (!loan.ipay_signed_at || !loan.organization_signed_at) {
        console.warn('⚠️ Borrower signing event received but iPay or Org has not signed yet');
        console.log('Current timestamps:', {
          ipay_signed_at: loan.ipay_signed_at,
          organization_signed_at: loan.organization_signed_at
        });
        return NextResponse.json({ received: true });
      }

      // Check if borrower hasn't signed yet
      if (!loan.borrower_signed_at) {
        console.log('✅ Borrower (recipient #3) completed signing via email');

        const updateData = {
          borrower_signed_at: completedTime,
          status: 'fully_signed',
          docusign_completed_at: completedTime,
          updated_at: new Date().toISOString()
        };

        console.log('📝 Updating loan with:', updateData);

        const { data: updatedLoan, error } = await supabase
          .from('loans')
          .update(updateData)
          .eq('docusign_envelope_id', envelopeId)
          .select()
          .single();

        if (error) {
          console.error('❌ Failed to update loan:', error);
        } else {
          console.log('✅ Loan updated successfully');
          console.log('New status:', updatedLoan.status);
          console.log('🎉 All signatures complete! Document is fully executed.');
        }
      } else {
        // This is either iPay or Organization signing (handled by redirect flow)
        // or borrower already signed - just log and ignore
        console.log('ℹ️ Ignoring recipient-completed event (handled by embedded signing redirect or already signed)');
        console.log('Current timestamps:', {
          ipay_signed_at: loan.ipay_signed_at,
          organization_signed_at: loan.organization_signed_at,
          borrower_signed_at: loan.borrower_signed_at
        });
      }
    }

    // Handle envelope-completed event as a backup
    else if (event === 'envelope-completed') {
      console.log('📋 Envelope completed event');

      // Only update if all parties have signed but status isn't fully_signed yet
      if (loan.ipay_signed_at && loan.organization_signed_at && loan.borrower_signed_at) {
        if (loan.status !== 'fully_signed') {
          console.log('🎉 Marking envelope as fully signed');

          const { error } = await supabase
            .from('loans')
            .update({
              status: 'fully_signed',
              docusign_completed_at: loan.docusign_completed_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('docusign_envelope_id', envelopeId);

          if (error) {
            console.error('❌ Failed to update loan:', error);
          } else {
            console.log('✅ Loan marked as fully signed');
          }
        }
      } else {
        console.log('ℹ️ Envelope completed but not all parties have signed yet');
      }
    }

    // Return success to DocuSign
    return NextResponse.json({ received: true });

  } catch (error: unknown) {
    console.error('❌ Webhook processing failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Still return 200 to DocuSign to prevent retries
    return NextResponse.json({ received: true, error: errorMessage });
  }
}

/**
 * PATCH /api/docusign/webhook
 *
 * Manual endpoint for admins to mark borrower as signed when DocuSign webhooks are unavailable
 * This reuses the same validation and update logic as the automatic webhook
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId } = body;

    console.log('📝 Manual borrower signature marking requested for loan:', loanId);

    if (!loanId) {
      return NextResponse.json({
        success: false,
        error: 'Loan ID is required'
      }, { status: 400 });
    }

    // Verify admin authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated'
      }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }

    // Get the loan with current signing timestamps
    const { data: loan } = await supabase
      .from('loans')
      .select(`
        id,
        ipay_signed_at,
        docusign_completed_at,
        organization_signed_at,
        borrower_signed_at,
        status,
        docusign_envelope_id
      `)
      .eq('id', loanId)
      .single();

    if (!loan) {
      return NextResponse.json({
        success: false,
        error: 'Loan not found'
      }, { status: 404 });
    }

    // Validate that iPay and Organization have already signed
    if (!loan.ipay_signed_at || !loan.organization_signed_at) {
      return NextResponse.json({
        success: false,
        error: 'iPay and Organization must sign before borrower can be marked as signed',
        details: {
          ipay_signed: !!loan.ipay_signed_at,
          organization_signed: !!loan.organization_signed_at
        }
      }, { status: 400 });
    }

    // Check if borrower already signed
    if (loan.borrower_signed_at) {
      return NextResponse.json({
        success: false,
        error: 'Borrower has already been marked as signed',
        borrower_signed_at: loan.borrower_signed_at
      }, { status: 400 });
    }

    // Mark borrower as signed - same logic as webhook
    const completedTime = new Date().toISOString();
    const updateData = {
      borrower_signed_at: completedTime,
      status: 'fully_signed',
      docusign_completed_at: completedTime,
      updated_at: completedTime
    };

    console.log('📝 Manually updating loan with:', updateData);

    const { data: updatedLoan, error } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', loanId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to update loan:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to update loan status'
      }, { status: 500 });
    }

    console.log('✅ Loan updated successfully via manual marking');
    console.log('New status:', updatedLoan.status);
    console.log('🎉 All signatures complete! Document is fully executed.');

    return NextResponse.json({
      success: true,
      message: 'Borrower marked as signed successfully',
      loan: {
        id: updatedLoan.id,
        status: updatedLoan.status,
        borrower_signed_at: updatedLoan.borrower_signed_at,
        docusign_completed_at: updatedLoan.docusign_completed_at
      }
    });

  } catch (error: unknown) {
    console.error('❌ Manual signature marking failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * GET /api/docusign/webhook
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'DocuSign webhook endpoint is active',
    description: 'Borrower-only webhook (iPay and Org handled via embedded redirect)',
    workflow: {
      stage1: {
        role: 'iPay Admin',
        timestamp: 'ipay_signed_at',
        status_after: 'ipay_approved',
        handler: 'Embedded signing redirect → /api/docusign/update-signing-timestamp'
      },
      stage2: {
        role: 'Organization Owner',
        timestamp: 'organization_signed_at',
        status_after: 'dealer_approved',
        handler: 'Embedded signing redirect → /api/docusign/update-signing-timestamp'
      },
      stage3: {
        role: 'Borrower',
        timestamp: 'borrower_signed_at',
        status_after: 'fully_signed',
        handler: 'DocuSign email → This webhook OR Manual admin marking via PATCH'
      }
    },
    logic: 'Webhook only processes borrower signature (when both ipay_signed_at and organization_signed_at exist)',
    manual_trigger: 'PATCH /api/docusign/webhook with { loanId } (admin only)'
  });
}