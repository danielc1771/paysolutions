import { NextRequest, NextResponse } from 'next/server';
import { getEnvelopesApi } from '@/utils/docusign/jwt-client';

/**
 * GET /api/docusign/envelope/[envelopeId]/status
 * 
 * Get the status of a DocuSign envelope
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ envelopeId: string }> }
) {
  try {
    const { envelopeId } = await params;

    if (!envelopeId) {
      return NextResponse.json(
        { error: 'Missing envelopeId' },
        { status: 400 }
      );
    }

    const envelopesApi = await getEnvelopesApi();
    
    // Get envelope details
    const envelope = await envelopesApi.getEnvelope(
      process.env.API_ACCOUNT_ID!,
      envelopeId
    );

    console.log('📋 Envelope status:', {
      envelopeId,
      status: envelope.status,
      sentDateTime: envelope.sentDateTime,
      statusDateTime: envelope.statusDateTime,
    });

    return NextResponse.json({
      success: true,
      envelope: {
        envelopeId: envelope.envelopeId,
        status: envelope.status,
        sentDateTime: envelope.sentDateTime,
        statusDateTime: envelope.statusDateTime,
        emailSubject: envelope.emailSubject,
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error getting envelope status:', error);
    
    if (error && typeof error === 'object' && 'response' in error) {
      const errorResponse = (error as { response?: { body?: unknown } }).response;
      console.error('DocuSign API response:', JSON.stringify(errorResponse?.body, null, 2));
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to get envelope status';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
