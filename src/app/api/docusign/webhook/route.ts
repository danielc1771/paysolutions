import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json();
    
    console.log('🔔 DocuSign webhook received:', JSON.stringify(webhookData, null, 2));
    console.log('📊 Webhook headers:', Object.fromEntries(request.headers.entries()));
    console.log('⏰ Webhook timestamp:', new Date().toISOString());
    
    // DocuSign webhook can have different structures, handle both formats
    let envelopeId: string;
    let status: string;
    let completedDateTime: string | undefined;
    let statusChangedDateTime: string | undefined;

    // Handle different webhook payload structures
    if (webhookData.data && webhookData.data.envelopeId) {
      // Format 1: { event, data: { envelopeId, envelopeSummary: { status } } }
      envelopeId = webhookData.data.envelopeId;
      status = webhookData.data.envelopeSummary?.status || webhookData.data.status;
      completedDateTime = webhookData.data.envelopeSummary?.completedDateTime;
      statusChangedDateTime = webhookData.data.envelopeSummary?.statusChangedDateTime;
    } else if (webhookData.envelopeId) {
      // Format 2: Direct envelope data
      envelopeId = webhookData.envelopeId;
      status = webhookData.status || webhookData.envelopeStatus;
      completedDateTime = webhookData.completedDateTime;
      statusChangedDateTime = webhookData.statusChangedDateTime;
    } else {
      console.error('❌ Unknown webhook payload format:', webhookData);
      return NextResponse.json({ error: 'Invalid webhook payload format' }, { status: 400 });
    }

    if (!envelopeId || !status) {
      console.error('❌ Missing required webhook data:', { envelopeId, status });
      return NextResponse.json({ error: 'Missing envelope ID or status' }, { status: 400 });
    }

    console.log('📋 Processed webhook data:', { 
      envelopeId, 
      status, 
      completedDateTime, 
      statusChangedDateTime 
    });

    // Update loan record based on envelope status
    const supabase = await createClient();
    
    // Find loan by envelope ID
    const { data: loan, error: findError } = await supabase
      .from('loans')
      .select('id, status, docusign_status')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (findError || !loan) {
      console.error('❌ Loan not found for envelope:', envelopeId, findError);
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    console.log('📄 Found loan:', { 
      loanId: loan.id, 
      currentStatus: loan.status, 
      currentDocuSignStatus: loan.docusign_status 
    });

    // Determine new loan status based on DocuSign status
    let newLoanStatus = loan.status;
    let docusignStatus = status.toLowerCase();

    switch (docusignStatus) {
      case 'completed':
      case 'signed':
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

    // Update loan record
    const updateData: any = {
      docusign_status: docusignStatus,
      docusign_status_updated: new Date().toISOString()
    };

    if (newLoanStatus !== loan.status) {
      updateData.status = newLoanStatus;
    }

    if (completedDateTime) {
      updateData.docusign_completed_at = completedDateTime;
    }

    console.log('💾 Updating loan with data:', updateData);

    const { error: updateError } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', loan.id);

    if (updateError) {
      console.error('❌ Failed to update loan:', updateError);
      return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
    }

    console.log(`✅ Loan ${loan.id} updated successfully: DocuSign ${docusignStatus}, Loan status: ${newLoanStatus}`);
    
    // Log successful webhook processing for monitoring
    console.log('📈 Webhook processing summary:', {
      envelopeId,
      loanId: loan.id,
      oldDocuSignStatus: loan.docusign_status,
      newDocuSignStatus: docusignStatus,
      oldLoanStatus: loan.status,
      newLoanStatus,
      completedDateTime,
      statusChangedDateTime,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      loanId: loan.id,
      docusignStatus,
      loanStatus: newLoanStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ DocuSign webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ message: 'DocuSign webhook endpoint' });
}
