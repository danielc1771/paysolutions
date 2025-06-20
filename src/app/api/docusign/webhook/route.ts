import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json();
    
    // DocuSign webhook event data
    const { 
      event,
      data: { 
        envelopeId, 
        envelopeSummary: { 
          status, 
          statusChangedDateTime,
          completedDateTime 
        } 
      } 
    } = webhookData;

    console.log('DocuSign webhook received:', { event, envelopeId, status });

    // Update loan record based on envelope status
    const supabase = await createClient();
    
    // Find loan by envelope ID
    const { data: loan, error: findError } = await supabase
      .from('loans')
      .select('id, status')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (findError || !loan) {
      console.error('Loan not found for envelope:', envelopeId);
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

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
        // Document sent, no loan status change needed
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

    const { error: updateError } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', loan.id);

    if (updateError) {
      console.error('Failed to update loan:', updateError);
      return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
    }

    console.log(`Loan ${loan.id} updated: DocuSign ${docusignStatus}, Loan status: ${newLoanStatus}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });

  } catch (error) {
    console.error('DocuSign webhook error:', error);
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
