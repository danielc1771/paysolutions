import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to simulate DocuSign webhook calls
 * This helps test the webhook functionality without actually signing documents
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const envelopeId = searchParams.get('envelopeId');
    const status = searchParams.get('status') || 'completed';
    
    if (!envelopeId) {
      return NextResponse.json(
        { error: 'envelopeId query parameter is required' },
        { status: 400 }
      );
    }

    // Simulate DocuSign webhook payload
    const webhookPayload = {
      event: 'envelope-completed',
      data: {
        envelopeId: envelopeId,
        envelopeSummary: {
          status: status,
          statusChangedDateTime: new Date().toISOString(),
          completedDateTime: status === 'completed' ? new Date().toISOString() : undefined
        }
      }
    };

    console.log('🧪 Testing webhook with payload:', webhookPayload);

    // Get the webhook URL
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const webhookUrl = `${protocol}://${host}/api/docusign/webhook`;

    // Call our webhook endpoint
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Test webhook sent successfully',
      webhookUrl,
      payload: webhookPayload,
      result,
      status: response.status
    });

  } catch (error) {
    console.error('❌ Test webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to send test webhook' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'DocuSign Test Webhook Endpoint',
    usage: [
      'POST /api/docusign/test-webhook?envelopeId=your-envelope-id',
      'POST /api/docusign/test-webhook?envelopeId=your-envelope-id&status=completed',
      'POST /api/docusign/test-webhook?envelopeId=your-envelope-id&status=declined'
    ],
    instructions: [
      '1. Create a loan and send DocuSign agreement',
      '2. Copy the envelope ID from the logs',
      '3. Call this endpoint with the envelope ID',
      '4. Check that the loan status updates to "signed"'
    ]
  });
}