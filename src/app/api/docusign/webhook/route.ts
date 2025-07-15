import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const userAgent = request.headers.get('user-agent') || '';
    let webhookData: Record<string, unknown>;
    
    console.log('🔔 DocuSign webhook received');
    console.log('📊 Content-Type:', contentType);
    console.log('👤 User-Agent:', userAgent);
    console.log('🌐 Domain:', request.headers.get('host'));
    console.log('🔗 Origin:', request.headers.get('origin'));
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    // Handle both JSON and XML formats
    if (contentType.includes('application/json')) {
      webhookData = await request.json();
      console.log('📋 JSON webhook data:', JSON.stringify(webhookData, null, 2));
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      // For XML format, we'll need to parse it - for now, log it
      const xmlData = await request.text();
      console.log('📋 XML webhook data:', xmlData);
      
      // For now, return success for XML until we implement XML parsing
      return new Response('Success', { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    } else {
      // Try to parse as JSON by default
      try {
        webhookData = await request.json();
        console.log('📋 Default JSON webhook data:', JSON.stringify(webhookData, null, 2));
      } catch (parseError) {
        const textData = await request.text();
        console.log('📋 Raw webhook data:', textData);
        console.log('❌ Failed to parse webhook data:', parseError);
        
        // Still return success to avoid webhook retries
        return new Response('Received but could not parse', { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }
    
    // DocuSign webhook can have different structures, handle both formats
    let envelopeId: string;
    let status: string | undefined;
    let eventType: string | undefined;
    let completedDateTime: string | undefined;
    let statusChangedDateTime: string | undefined;

    // Handle different webhook payload structures
    let customFields: Record<string, string> = {};
    
    // Check if this is an event-based webhook
    if (webhookData.event && webhookData.data) {
      // Event-based webhook format (e.g., recipient-completed)
      eventType = webhookData.event as string;
      const data = webhookData.data as Record<string, unknown>;
      envelopeId = data.envelopeId as string;
      
      console.log(`📌 Event-based webhook received: ${eventType}`);
      
      // Map events to status
      switch (eventType) {
        case 'recipient-completed':
          status = 'completed';
          completedDateTime = webhookData.generatedDateTime as string | undefined;
          break;
        case 'envelope-completed':
          status = 'completed';
          completedDateTime = webhookData.generatedDateTime as string | undefined;
          break;
        case 'envelope-declined':
          status = 'declined';
          statusChangedDateTime = webhookData.generatedDateTime as string | undefined;
          break;
        case 'envelope-voided':
          status = 'voided';
          statusChangedDateTime = webhookData.generatedDateTime as string | undefined;
          break;
        case 'envelope-sent':
          status = 'sent';
          statusChangedDateTime = webhookData.generatedDateTime as string | undefined;
          break;
        case 'envelope-delivered':
          status = 'delivered';
          statusChangedDateTime = webhookData.generatedDateTime as string | undefined;
          break;
        default:
          console.log(`ℹ️ Unhandled event type: ${eventType}`);
          // For unhandled events, we'll still process but won't update status
      }
      
      // Extract custom fields if present in the envelope summary
      if (data.envelopeSummary && typeof data.envelopeSummary === 'object') {
        const envelopeSummary = data.envelopeSummary as Record<string, unknown>;
        if (envelopeSummary.customFields) {
          customFields = envelopeSummary.customFields as Record<string, string>;
        }
      }
    } else {
      console.error('❌ Unknown webhook payload format:', webhookData);
      return NextResponse.json({ error: 'Invalid webhook payload format' }, { status: 400 });
    }

    if (!envelopeId) {
      console.error('❌ Missing envelope ID in webhook data');
      return NextResponse.json({ error: 'Missing envelope ID' }, { status: 400 });
    }
    
    // For event-based webhooks without status, we might not update the status
    if (!status && !eventType) {
      console.error('❌ Missing status or event type in webhook data');
      return NextResponse.json({ error: 'Missing status or event type' }, { status: 400 });
    }

    console.log('📋 Processed webhook data:', { 
      envelopeId, 
      status,
      eventType,
      completedDateTime, 
      statusChangedDateTime,
      customFields
    });

    // Update loan record based on envelope status
    const supabase = await createClient();
    
    // Find loan by envelope ID (primary method)
    let { data: loan, error: findError } = await supabase
      .from('loans')
      .select('id, status, docusign_status')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    // If not found and we have custom fields, try to find by loan_id
    if (findError && customFields.loan_id) {
      console.log('🔍 Attempting to find loan by custom field loan_id:', customFields.loan_id);
      const { data: loanByCustomField, error: customFieldError } = await supabase
        .from('loans')
        .select('id, status, docusign_status')
        .eq('id', customFields.loan_id)
        .single();
      
      if (!customFieldError && loanByCustomField) {
        loan = loanByCustomField;
        findError = null;
        console.log('✅ Found loan using custom field');
      }
    }

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
    let docusignStatus: string | undefined;
    
    // Only process status updates if we have a status
    if (status) {
      docusignStatus = status.toLowerCase();

      switch (docusignStatus) {
        case 'completed':
        case 'signed':
          newLoanStatus = 'signed'; // Document is signed, ready for funding
          docusignStatus = 'signed'; // Normalize to 'signed' for our UI
          console.log('✅ Document completed/signed - updating loan status to signed');
          break;
        case 'declined':
        case 'voided':
          newLoanStatus = 'review'; // Back to review if declined/voided
          console.log('⚠️ Document declined/voided - updating loan status to review');
          break;
        case 'sent':
        case 'delivered':
          // Document sent/delivered, no loan status change needed
          console.log('📤 Document sent/delivered - no loan status change');
          break;
        default:
          console.log('ℹ️ Unknown DocuSign status:', docusignStatus);
      }
    } else if (eventType) {
      // For event-only webhooks without mapped status, just log
      console.log(`📌 Processing event-only webhook: ${eventType} - no status update`);
    }

    // Update loan record
    const updateData: Record<string, unknown> = {
      docusign_status_updated: new Date().toISOString()
    };
    
    // Only update docusign_status if we have a status
    if (docusignStatus) {
      updateData.docusign_status = docusignStatus;
    }

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

    // DocuSign expects a 200 response with simple text for acknowledgment
    return new Response('Success', { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });

  } catch (error) {
    console.error('❌ DocuSign webhook error:', error);
    // Still return success to avoid webhook retries for application errors
    return new Response('Error processed', { 
      status: 200,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
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
