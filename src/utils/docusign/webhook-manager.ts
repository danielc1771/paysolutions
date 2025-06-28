import 'server-only';
import { createEnvelopesApi } from './client';

/**
 * Webhook Management Utility for DocuSign
 * 
 * This utility helps register and manage DocuSign webhook endpoints
 * to ensure proper state synchronization.
 */

export interface WebhookConfig {
  url: string;
  events: string[];
  name?: string;
  enabled?: boolean;
}

/**
 * Register a webhook with DocuSign
 */
export async function registerWebhook(config: WebhookConfig) {
  try {
    console.log('🔗 Registering DocuSign webhook:', config.url);
    
    await createEnvelopesApi();
    
    // Create webhook configuration
    const webhookConfig = {
      connectId: `paysolutions-webhook-${Date.now()}`,
      name: config.name || 'PaySolutions Loan Webhook',
      urlToPublishTo: config.url,
      enabled: config.enabled !== false ? 'true' : 'false',
      enableLog: 'true',
      requireAcknowledgment: 'false',
      loggingEnabled: 'true',
      includeDocumentFields: 'false',
      includeSenderAccountAsCustomField: 'false',
      includeEnvelopeVoidReason: 'true',
      includeTimeZone: 'true',
      includeCertificateOfCompletion: 'false',
      includeDocuments: 'false',
      events: config.events
    };

    // Note: DocuSign SDK doesn't have direct webhook creation in envelope API
    // This would typically be done through the Connect API or admin interface
    console.log('📋 Webhook configuration prepared:', webhookConfig);
    
    return {
      success: true,
      message: 'Webhook configuration prepared. Please register manually in DocuSign Admin.',
      config: webhookConfig
    };
    
  } catch (error) {
    console.error('❌ Error preparing webhook registration:', error);
    throw error;
  }
}

/**
 * Get recommended webhook events for loan processing
 */
export function getRecommendedWebhookEvents(): string[] {
  return [
    'envelope-sent',
    'envelope-delivered',
    'envelope-completed',
    'envelope-declined',
    'envelope-voided',
    'recipient-completed'
  ];
}

/**
 * Validate webhook URL accessibility
 */
export async function validateWebhookUrl(url: string): Promise<boolean> {
  try {
    console.log('🔍 Validating webhook URL:', url);
    
    // Basic URL validation
    const urlObj = new URL(url);
    
    if (urlObj.protocol !== 'https:') {
      console.warn('⚠️ Webhook URL should use HTTPS');
      return false;
    }
    
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      console.warn('⚠️ Webhook URL cannot be localhost - DocuSign needs public access');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Invalid webhook URL:', error);
    return false;
  }
}

/**
 * Generate webhook registration instructions
 */
export function generateWebhookInstructions(webhookUrl: string): string {
  return `
# DocuSign Webhook Registration Instructions

## Step 1: Access DocuSign Admin
1. Log into your DocuSign account
2. Go to Settings → Connect (or Admin → Connect)

## Step 2: Create New Connection
1. Click "ADD CONFIGURATION" or "New Connection"
2. Fill in the following details:

**Basic Information:**
- Name: PaySolutions Loan Webhook
- URL to Publish to: ${webhookUrl}
- Enable logging: Yes
- Require Acknowledgment: No

**Events to Subscribe to:**
${getRecommendedWebhookEvents().map(event => `- ${event}`).join('\n')}

**Additional Settings:**
- Include Certificate of Completion: No
- Include Documents: No
- Include Envelope Void Reason: Yes
- Include Time Zone Information: Yes

## Step 3: Test Connection
1. Use "Test Connection" feature in DocuSign
2. Check server logs for webhook receipt
3. Verify URL is publicly accessible

## Step 4: Activate
1. Save the configuration
2. Ensure status is "Active"

## Troubleshooting
- Webhook URL must be HTTPS and publicly accessible
- Check firewall settings
- Monitor server logs at: ${webhookUrl}
`;
}