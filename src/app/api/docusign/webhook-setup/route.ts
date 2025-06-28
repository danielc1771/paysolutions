import { NextRequest, NextResponse } from 'next/server';
import { 
  registerWebhook, 
  validateWebhookUrl, 
  getRecommendedWebhookEvents,
  generateWebhookInstructions 
} from '@/utils/docusign/webhook-manager';

/**
 * API endpoint to help set up DocuSign webhooks
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    // Get the base URL for webhook
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host');
    const webhookUrl = `${protocol}://${host}/api/docusign/webhook`;
    
    if (action === 'validate') {
      const isValid = await validateWebhookUrl(webhookUrl);
      return NextResponse.json({
        valid: isValid,
        webhookUrl,
        message: isValid 
          ? 'Webhook URL is valid for DocuSign registration'
          : 'Webhook URL has issues - check console for details'
      });
    }
    
    if (action === 'instructions') {
      const instructions = generateWebhookInstructions(webhookUrl);
      return NextResponse.json({
        instructions,
        webhookUrl,
        events: getRecommendedWebhookEvents()
      });
    }
    
    // Default: return current webhook status
    return NextResponse.json({
      webhookUrl,
      events: getRecommendedWebhookEvents(),
      instructions: generateWebhookInstructions(webhookUrl),
      nextSteps: [
        'Copy the webhook URL above',
        'Follow the instructions to register in DocuSign Admin',
        'Test the webhook using DocuSign\'s test connection feature',
        'Monitor /api/docusign/webhook endpoint for incoming events'
      ]
    });
    
  } catch (error) {
    console.error('❌ Webhook setup error:', error);
    return NextResponse.json(
      { error: 'Failed to set up webhook configuration' },
      { status: 500 }
    );
  }
}

/**
 * Register webhook configuration (preparation only)
 */
export async function POST(request: NextRequest) {
  try {
    const { webhookUrl, events } = await request.json();
    
    // Validate inputs
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }
    
    const isValid = await validateWebhookUrl(webhookUrl);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 400 }
      );
    }
    
    // Prepare webhook registration
    const result = await registerWebhook({
      url: webhookUrl,
      events: events || getRecommendedWebhookEvents(),
      name: 'PaySolutions Loan Webhook'
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Webhook registration preparation error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare webhook registration' },
      { status: 500 }
    );
  }
}