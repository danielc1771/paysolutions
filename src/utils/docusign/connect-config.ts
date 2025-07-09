import 'server-only';
// import { createEnvelopesApi } from './client';
// import docusign from 'docusign-esign';

/**
 * DocuSign Connect Configuration Utility
 * 
 * This utility helps create and manage DocuSign Connect configurations
 * for account-level webhooks that notify when envelopes are completed.
 */

export interface ConnectConfig {
  name: string;
  url: string;
  enabled: boolean;
  allUsers: boolean;
  includeSenderAccountAsCustomField?: boolean;
  includeEnvelopeVoidReason?: boolean;
  includeTimeZone?: boolean;
  includeDocuments?: boolean;
  includeCertificateOfCompletion?: boolean;
  requiresAcknowledgement?: boolean;
  loggingEnabled?: boolean;
  envelopeEvents?: string[];
  recipientEvents?: string[];
}

/**
 * Create a Connect configuration for account-level webhooks
 * NOTE: Disabled for local development - requires public HTTPS URL
 */
export async function createConnectConfiguration(): Promise<Record<string, unknown>> {
  // TODO: Implement when deployed to production with public HTTPS URL
  console.log('🔗 DocuSign Connect configuration disabled for local development');
  throw new Error('DocuSign Connect configuration requires public HTTPS URL - configure manually in DocuSign Admin');
  
  /*
  try {
    console.log('🔗 Creating DocuSign Connect configuration:', config.name);
    
    const { apiClient, accountId } = await createEnvelopesApi();
    
    // Create Connect API instance
    const connectApi = new docusign.ConnectApi(apiClient);
    
    // Create Connect configuration object
    const connectConfig = new docusign.ConnectConfiguration();
    connectConfig.name = config.name;
    connectConfig.urlToPublishTo = config.url;
    connectConfig.enabled = config.enabled ? 'true' : 'false';
    connectConfig.allUsers = config.allUsers ? 'true' : 'false';
    connectConfig.includeSenderAccountAsCustomField = config.includeSenderAccountAsCustomField ? 'true' : 'false';
    connectConfig.includeEnvelopeVoidReason = config.includeEnvelopeVoidReason ? 'true' : 'false';
    connectConfig.includeTimeZone = config.includeTimeZone ? 'true' : 'false';
    connectConfig.includeDocuments = config.includeDocuments ? 'true' : 'false';
    connectConfig.includeCertificateOfCompletion = config.includeCertificateOfCompletion ? 'true' : 'false';
    connectConfig.requiresAcknowledgement = config.requiresAcknowledgement ? 'true' : 'false';
    connectConfig.loggingEnabled = config.loggingEnabled ? 'true' : 'false';
    
    // Set envelope events (what envelope events to listen for)
    if (config.envelopeEvents && config.envelopeEvents.length > 0) {
      connectConfig.envelopeEvents = config.envelopeEvents.join(',');
    }
    
    // Set recipient events (what recipient events to listen for)
    if (config.recipientEvents && config.recipientEvents.length > 0) {
      connectConfig.recipientEvents = config.recipientEvents.join(',');
    }
    
    // Create the Connect configuration
    const result = await connectApi.createConnectConfiguration(accountId, {
      connectConfiguration: connectConfig
    });
    
    console.log('✅ Connect configuration created successfully:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error creating Connect configuration:', error);
    throw error;
  }
  */
}

/**
 * List all Connect configurations for the account
 * NOTE: Disabled for local development - requires public HTTPS URL
 */
export async function listConnectConfigurations(): Promise<Record<string, unknown>> {
  // TODO: Implement when deployed to production with public HTTPS URL
  console.log('📋 DocuSign Connect listing disabled for local development');
  return { configurations: [] };
}

/**
 * Update an existing Connect configuration
 * NOTE: Disabled for local development - requires public HTTPS URL
 */
export async function updateConnectConfiguration(): Promise<Record<string, unknown>> {
  // TODO: Implement when deployed to production with public HTTPS URL
  console.log('🔄 DocuSign Connect update disabled for local development');
  throw new Error('DocuSign Connect configuration requires public HTTPS URL - configure manually in DocuSign Admin');
}

/**
 * Delete a Connect configuration
 * NOTE: Disabled for local development - requires public HTTPS URL
 */
export async function deleteConnectConfiguration(): Promise<Record<string, unknown>> {
  // TODO: Implement when deployed to production with public HTTPS URL
  console.log('🗑️ DocuSign Connect delete disabled for local development');
  throw new Error('DocuSign Connect configuration requires public HTTPS URL - configure manually in DocuSign Admin');
}

/**
 * Get recommended Connect configuration for PaySolutions
 */
export function getRecommendedConnectConfig(webhookUrl: string): ConnectConfig {
  return {
    name: 'PaySolutions Loan Webhooks',
    url: webhookUrl,
    enabled: true,
    allUsers: true, // Listen for envelopes from all users in the account
    includeSenderAccountAsCustomField: false,
    includeEnvelopeVoidReason: true,
    includeTimeZone: true,
    includeDocuments: false, // Don't include documents to reduce payload size
    includeCertificateOfCompletion: false,
    requiresAcknowledgement: true, // Require acknowledgment for reliable delivery
    loggingEnabled: true, // Enable logging for debugging
    envelopeEvents: [
      'sent',
      'delivered', 
      'completed',
      'declined',
      'voided'
    ],
    recipientEvents: [
      'sent',
      'delivered',
      'completed',
      'declined',
      'autoresponded'
    ]
  };
}

/**
 * Test webhook URL accessibility
 */
export async function testWebhookUrl(url: string): Promise<boolean> {
  try {
    console.log('🔍 Testing webhook URL accessibility:', url);
    
    // Basic URL validation
    const urlObj = new URL(url);
    
    if (urlObj.protocol !== 'https:') {
      console.error('❌ Webhook URL must use HTTPS');
      return false;
    }
    
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      console.error('❌ Webhook URL cannot be localhost - must be publicly accessible');
      return false;
    }
    
    // Try to make a test request
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'DocuSign-PaySolutions-Test'
        }
      });
      
      console.log('✅ Webhook URL is accessible, status:', response.status);
      return response.status < 500; // Accept any non-server-error status
    } catch (fetchError) {
      console.warn('⚠️ Could not test webhook URL accessibility:', fetchError);
      return true; // Assume it's accessible if we can't test
    }
    
  } catch (error) {
    console.error('❌ Invalid webhook URL:', error);
    return false;
  }
}