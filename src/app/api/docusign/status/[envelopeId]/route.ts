import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createEnvelopesApi } from '@/utils/docusign/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ envelopeId: string }> }
) {
  try {
    const { envelopeId } = await params;

    if (!envelopeId) {
      return NextResponse.json({ error: 'Envelope ID is required' }, { status: 400 });
    }

    console.log('🔍 Checking DocuSign envelope status:', envelopeId);

    // Get envelope status directly from DocuSign API
    const { envelopesApi, accountId } = await createEnvelopesApi();

    // Call DocuSign API to get current envelope status
    const envelopeData = await envelopesApi.getEnvelope(accountId, envelopeId);

    // Get recipient information to check signing status
    let hasSignedRecipients = false;
    let recipientDetails: Record<string, unknown>[] = [];
    
    try {
      // Use the correct method name from DocuSign SDK
      const recipientsResponse = await (envelopesApi as Record<string, unknown>).listRecipients(accountId, envelopeId) as Record<string, unknown>;
      
      recipientDetails = (recipientsResponse.signers as Record<string, unknown>[])?.map((s: Record<string, unknown>) => ({
        name: s.name,
        email: s.email,
        status: s.status,
        signedDateTime: s.signedDateTime
      })) || [];

      // Check if any signers have completed signing
      hasSignedRecipients = (recipientsResponse.signers as Record<string, unknown>[])?.some((s: Record<string, unknown>) => 
        s.status === 'completed' || s.signedDateTime
      ) || false;
    } catch (recipientError) {
      console.warn('⚠️ Could not fetch recipient details:', recipientError);
      // Fall back to envelope status only
    }

    console.log('📋 DocuSign envelope data:', {
      envelopeId,
      status: envelopeData.status,
      completedDateTime: envelopeData.completedDateTime,
      statusChangedDateTime: envelopeData.statusChangedDateTime,
      hasSignedRecipients,
      recipients: recipientDetails
    });

    // Update database with current status
    const supabase = await createClient();
    
    // Find loan by envelope ID and get borrower info for notification
    const { data: loan, error: findError } = await supabase
      .from('loans')
      .select('id, status, docusign_status, loan_number, borrower:borrower_id(first_name, last_name)')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (findError || !loan) {
      console.error('❌ Loan not found for envelope:', envelopeId);
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    console.log('🔍 Current loan status in DB:', {
      loanId: loan.id,
      currentDocuSignStatus: loan.docusign_status,
      currentLoanStatus: loan.status,
      newDocuSignStatus: envelopeData.status?.toLowerCase()
    });

    // Determine new loan status based on DocuSign status
    let newLoanStatus = loan.status;
    let docusignStatus = envelopeData.status?.toLowerCase() || 'unknown';

    // Enhanced status detection - check both envelope status and recipient status
    const isActuallySigned = docusignStatus === 'completed' || 
                            (hasSignedRecipients && envelopeData.completedDateTime) ||
                            hasSignedRecipients;

    if (isActuallySigned) {
      console.log('🎉 Document is actually signed!');
      docusignStatus = 'signed'; // Normalize to 'signed' for our UI
      newLoanStatus = 'signed'; // Document is signed, ready for admin approval
      
      // Create notification for document signing
      try {
        const borrower = Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower;
        const borrowerName = borrower ? `${borrower.first_name} ${borrower.last_name}` : 'Borrower';
        const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'document_signed',
            title: 'Document Signed',
            message: `${borrowerName} signed loan agreement #${loan.loan_number}`,
            related_id: loan.id,
            related_table: 'loans'
          }),
        });

        if (!notificationResponse.ok) {
          console.warn('Failed to create notification for signed document');
        } else {
          console.log('✅ Notification created for signed document');
        }
      } catch (notificationError) {
        console.warn('Error creating notification for signed document:', notificationError);
        // Don't fail the status update if notification fails
      }
    } else {
      // Handle other statuses
      switch (docusignStatus) {
        case 'completed':
          newLoanStatus = 'signed'; // Document is signed, ready for admin approval
          docusignStatus = 'signed'; // Normalize to 'signed' for our UI
          break;
        case 'declined':
        case 'voided':
          newLoanStatus = 'review'; // Back to review if declined/voided
          break;
        case 'sent':
        case 'delivered':
          // Document sent/delivered, no loan status change needed
          break;
      }
    }

    // Only update if status has changed
    if (docusignStatus !== loan.docusign_status || newLoanStatus !== loan.status) {
      const updateData: Record<string, unknown> = {
        docusign_status: docusignStatus,
        docusign_status_updated: new Date().toISOString()
      };

      if (newLoanStatus !== loan.status) {
        updateData.status = newLoanStatus;
      }

      if (envelopeData.completedDateTime) {
        updateData.docusign_completed_at = envelopeData.completedDateTime;
      }

      console.log('💾 Updating loan with new status:', updateData);

      const { error: updateError } = await supabase
        .from('loans')
        .update(updateData)
        .eq('id', loan.id);

      if (updateError) {
        console.error('❌ Failed to update loan:', updateError);
        return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
      }

      console.log(`✅ Loan ${loan.id} updated: DocuSign ${docusignStatus}, Loan status: ${newLoanStatus}`);
    } else {
      console.log('📋 No status change detected, skipping database update');
    }

    return NextResponse.json({
      success: true,
      envelopeId,
      docusignStatus,
      loanStatus: newLoanStatus,
      loanId: loan.id,
      statusChanged: docusignStatus !== loan.docusign_status || newLoanStatus !== loan.status,
      envelopeData: {
        status: envelopeData.status,
        completedDateTime: envelopeData.completedDateTime,
        statusChangedDateTime: envelopeData.statusChangedDateTime,
        sentDateTime: (envelopeData as Record<string, unknown>).sentDateTime,
        deliveredDateTime: (envelopeData as Record<string, unknown>).deliveredDateTime
      }
    });

  } catch (error) {
    console.error('❌ DocuSign status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check DocuSign status' },
      { status: 500 }
    );
  }
}
