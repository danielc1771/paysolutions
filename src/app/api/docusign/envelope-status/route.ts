import { NextRequest, NextResponse } from 'next/server';
import { getEnvelopeStatus } from '@/utils/docusign/jwt-client';
import { createClient } from '@/utils/supabase/server';

/**
 * GET /api/docusign/envelope-status?envelopeId=xxx
 * 
 * Gets the status of a DocuSign envelope
 * 
 * Query params:
 * - envelopeId: string - The DocuSign envelope ID
 * 
 * Response:
 * - status: string - The envelope status (sent, delivered, completed, etc.)
 * - sentDateTime: string - When the envelope was sent
 * - completedDateTime: string - When the envelope was completed (if applicable)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const envelopeId = searchParams.get('envelopeId');

    if (!envelopeId) {
      return NextResponse.json(
        { error: 'Missing envelopeId query parameter' },
        { status: 400 }
      );
    }

    console.log('🔍 Checking envelope status:', envelopeId);

    // Get envelope status from DocuSign
    const status = await getEnvelopeStatus(envelopeId);

    console.log('✅ Envelope status retrieved:', status.status);

    // Update loan record with latest status
    const supabase = await createClient();
    await supabase
      .from('loans')
      .update({
        docusign_status: status.status,
        docusign_completed_at: status.completedDateTime || null,
        updated_at: new Date().toISOString()
      })
      .eq('docusign_envelope_id', envelopeId);

    return NextResponse.json({
      success: true,
      ...status
    });

  } catch (error: any) {
    console.error('❌ Failed to get envelope status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get envelope status' },
      { status: 500 }
    );
  }
}
