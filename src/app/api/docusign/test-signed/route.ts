import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to simulate a signed document webhook
 * Use this to test if your webhook processing logic works
 */
export async function POST(request: NextRequest) {
  try {
    const { envelopeId } = await request.json();
    
    if (!envelopeId) {
      return NextResponse.json({ error: 'envelopeId required' }, { status: 400 });
    }
    
    console.log('🧪 Testing signed document simulation for envelope:', envelopeId);
    
    // Create a mock webhook payload that simulates a completed/signed document
    const mockWebhookPayload = {
      event: "envelope-completed",
      data: {
        envelopeId: envelopeId,
        envelopeSummary: {
          status: "completed",
          completedDateTime: new Date().toISOString(),
          statusChangedDateTime: new Date().toISOString()
        }
      }
    };
    
    console.log('📤 Sending mock webhook payload:', mockWebhookPayload);
    
    // Call the actual webhook endpoint with mock data
    const webhookResponse = await fetch(`${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}/api/docusign/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockWebhookPayload)
    });
    
    const webhookResult = await webhookResponse.json();
    
    return NextResponse.json({
      message: 'Test completed',
      mockPayload: mockWebhookPayload,
      webhookResponse: {
        status: webhookResponse.status,
        data: webhookResult
      }
    });
    
  } catch (error) {
    console.error('Test simulation error:', error);
    return NextResponse.json({
      error: 'Test simulation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}