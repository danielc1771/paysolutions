import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * POST /api/docusign/webhook
 * 
 * Webhook endpoint for DocuSign to notify us of envelope events
 * 
 * DocuSign will send notifications when:
 * - Envelope is sent
 * - Envelope is delivered
 * - Envelope is completed (signed)
 * - Envelope is declined
 * - Envelope is voided
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📨 DocuSign webhook received');
    console.log('Event:', body.event);
    console.log('Envelope ID:', body.data?.envelopeId);

    // Extract envelope information
    const envelopeId = body.data?.envelopeId;
    const status = body.event; // e.g., "envelope-sent", "envelope-completed"

    if (!envelopeId) {
      console.warn('⚠️ Webhook received without envelope ID');
      return NextResponse.json({ received: true });
    }

    // Map DocuSign event to our status
    let docusignStatus = 'unknown';
    if (status.includes('sent')) docusignStatus = 'sent';
    if (status.includes('delivered')) docusignStatus = 'delivered';
    if (status.includes('completed')) docusignStatus = 'completed';
    if (status.includes('declined')) docusignStatus = 'declined';
    if (status.includes('voided')) docusignStatus = 'voided';

    console.log('📝 Updating loan with status:', docusignStatus);

    // Update loan record in Supabase
    const supabase = await createClient();
    
    const updateData: Record<string, string> = {
      docusign_status: docusignStatus,
      updated_at: new Date().toISOString()
    };

    // If completed, record completion time
    if (docusignStatus === 'completed') {
      updateData.docusign_completed_at = new Date().toISOString();
      
      // Optionally update loan status to indicate documents are signed
      updateData.status = 'documents_signed';
    }

    const { error } = await supabase
      .from('loans')
      .update(updateData)
      .eq('docusign_envelope_id', envelopeId);

    if (error) {
      console.error('❌ Failed to update loan:', error);
    } else {
      console.log('✅ Loan updated successfully');
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
 * GET /api/docusign/webhook
 * 
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'DocuSign webhook endpoint is active'
  });
}
