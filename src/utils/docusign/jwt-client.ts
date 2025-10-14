import 'server-only';
import * as docusign from 'docusign-esign';
import * as fs from 'fs';
import * as path from 'path';

// DocuSign JWT Configuration
const INTEGRATION_KEY = process.env.INTEGRATION_KEY;
const USER_ID = process.env.USER_ID;
const BASE_PATH = process.env.BASE_PATH;
const TEMPLATE_ID = process.env.TEMPLATE_ID;
const API_ACCOUNT_ID = process.env.API_ACCOUNT_ID;
const OAUTH_SCOPE = 'signature';

// Default signer emails (fallback values)
const DEFAULT_IPAY_EMAIL = 'ipaycustomer@gmail.com'; // iPay's official email - always stays the same
const DEFAULT_ORGANIZATION_EMAIL = 'support@example.com'; // Fallback only - should always use org's actual email

// Token storage interface
interface TokenData {
  access_token: string;
  expires_at: number;
}

// In-memory token storage (consider using Redis or database in production)
let tokenData: TokenData | null = null;

/**
 * Check and refresh JWT token if needed
 * This function follows the pattern from your example code
 */
export async function checkToken(): Promise<string> {
  // Re-use existing token if still valid
  if (tokenData && Date.now() < tokenData.expires_at) {
    console.log('🔄 Re-using existing access token');
    return tokenData.access_token;
  }

  console.log('🔑 Generating new JWT access token');

  if (!INTEGRATION_KEY || !USER_ID || !BASE_PATH) {
    throw new Error('Missing required DocuSign configuration. Check INTEGRATION_KEY, USER_ID, and BASE_PATH in .env');
  }

  try {
    const dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(BASE_PATH);

    // Read the private key from the file
    const privateKeyPath = path.join(process.cwd(), 'private.key');
    
    if (!fs.existsSync(privateKeyPath)) {
      throw new Error('private.key file not found. Please add your RSA private key to the root directory.');
    }

    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    
    if (!privateKey || privateKey.trim().length === 0) {
      throw new Error('private.key file is empty. Please add your RSA private key from DocuSign.');
    }

    // Request JWT User Token with 1 hour expiration
    const results = await dsApiClient.requestJWTUserToken(
      INTEGRATION_KEY,
      USER_ID,
      OAUTH_SCOPE,
      privateKey,
      3600 // 1 hour in seconds
    );

    console.log('✅ JWT token obtained successfully');
    console.log('Token expires in:', results.body.expires_in, 'seconds');

    // Store token with expiration (subtract 60s for safety margin)
    tokenData = {
      access_token: results.body.access_token,
      expires_at: Date.now() + (results.body.expires_in - 60) * 1000,
    };

    return tokenData.access_token;
  } catch (error: unknown) {
    console.error('❌ JWT token generation failed:', error);
    
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('Error response:', JSON.stringify((error as { response?: { body?: unknown } }).response?.body));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to obtain JWT token: ${errorMessage}`);
  }
}

/**
 * Get EnvelopesApi instance with authenticated client
 */
export async function getEnvelopesApi() {
  const accessToken = await checkToken();
  
  if (!BASE_PATH || !API_ACCOUNT_ID) {
    throw new Error('Missing DocuSign configuration');
  }

  const dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(BASE_PATH);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
  
  return new docusign.EnvelopesApi(dsApiClient);
}

/**
 * Create envelope definition with loan data and all three signers
 * Following the official DocuSign documentation pattern
 * 
 * Signing Order (All Embedded + Email):
 * 1. iPay (embedded recipient view - signs)
 * 2. Organization (embedded recipient view - signs)
 * 3. Borrower (email recipient view - signs via email)
 * 
 * @param borrowerName - Full name of the borrower
 * @param borrowerEmail - Email address of the borrower
 * @param tabValues - Pre-filled form field values
 * @param status - Envelope status: 'created' for draft (embedded), 'sent' for immediate send
 * @param ipayEmail - Email address of the iPay representative (default: DEFAULT_IPAY_EMAIL)
 * @param organizationEmail - Email address of the organization representative (default: DEFAULT_ORGANIZATION_EMAIL)
 * @param organizationName - Full name of the organization representative (default: 'Organization Representative')
 */
export function makeEnvelope(
  borrowerName: string,
  borrowerEmail: string,
  tabValues: Record<string, string> = {},
  status: 'created' | 'sent' = 'sent',
  ipayEmail: string = DEFAULT_IPAY_EMAIL,
  organizationEmail: string = DEFAULT_ORGANIZATION_EMAIL,
  organizationName: string = 'Organization Representative'
): docusign.EnvelopeDefinition {
  if (!TEMPLATE_ID) {
    throw new Error('Missing TEMPLATE_ID in environment variables');
  }

  // Create envelope definition
  const env = new docusign.EnvelopeDefinition();
  env.templateId = TEMPLATE_ID;

  // Create tabs object if we have values to pre-fill (for Borrower only)
  // Following official DocuSign documentation pattern for setting tab values
  let tabs;
  if (tabValues && Object.keys(tabValues).length > 0) {
    const textTabs: docusign.Text[] = [];
    
    // Create text tab objects for each field
    // Note: Using Text tabs for all fields (numbers, dates, etc.) as they're universally compatible
    Object.entries(tabValues).forEach(([tabLabel, value]) => {
      if (value) {
        textTabs.push(
          docusign.Text.constructFromObject({
            tabLabel: tabLabel,
            value: value,
            locked: 'false',
            required: 'false'
          })
        );
      }
    });

    // Create tabs object (following official documentation)
    tabs = docusign.Tabs.constructFromObject({
      textTabs: textTabs
    });
    
    console.log(`📝 Created ${textTabs.length} text tabs for pre-filling`);
  }

  // Signer 1: iPay (Routing Order 1) - Embedded recipient view (signs)
  const iPay = new docusign.TemplateRole();
  iPay.email = ipayEmail;
  iPay.name = 'iPay Representative';
  iPay.roleName = 'iPay';
  Object.assign(iPay, {
    routingOrder: '1',
    // clientUserId enables embedded signing
    clientUserId: `${INTEGRATION_KEY}-ipay`
  });
  // Attach all pre-filled tabs to iPay role (they review all information first)
  if (tabs) {
    iPay.tabs = tabs;
  }

  // Signer 2: Organization (Routing Order 2) - Embedded recipient view (signs in dashboard)
  const organization = new docusign.TemplateRole();
  organization.email = organizationEmail;
  organization.name = organizationName;
  organization.roleName = 'Organization';
  Object.assign(organization, {
    routingOrder: '2',
    // clientUserId enables embedded signing
    clientUserId: `${INTEGRATION_KEY}-organization`
  });

  // Signer 3: Borrower (Routing Order 3) - Email notification (signs via email link)
  const borrower = new docusign.TemplateRole();
  borrower.email = borrowerEmail;
  borrower.name = borrowerName;
  borrower.roleName = 'Borrower';
  Object.assign(borrower, {
    routingOrder: '3'
    // NO clientUserId - borrower signs via email link
  });
  // NO tabs - borrower only signs, doesn't fill out fields

  // Add all three template roles in correct order
  env.templateRoles = [iPay, organization, borrower];
  env.status = status; // 'created' for draft or 'sent' for immediate send

  console.log('📋 Envelope created with 3 signers (embedded + email):');
  console.log('  1. iPay:', ipayEmail, '(embedded recipient view - signs)');
  console.log('  2. Organization:', organizationEmail, '(embedded recipient view - signs)');
  console.log('  3. Borrower:', borrowerEmail, '(email - signs via email link)');
  console.log('  Status:', status);

  return env;
}

/**
 * Create sender view request for embedded signing
 * NOTE: This function is deprecated and no longer used.
 * All signers (iPay, Organization) now use recipient view.
 * Kept for backwards compatibility only.
 * 
 * @param returnUrl - URL to redirect after signing is complete
 * @deprecated Use makeRecipientViewRequest instead
 */
export function makeSenderViewRequest(returnUrl: string) {
  // ReturnUrlRequest is the correct type for sender view
  const viewRequest: { returnUrl: string } = {
    returnUrl: returnUrl
  };
  return viewRequest;
}

/**
 * Create recipient view request for embedded signing
 * This generates the URL for organization/borrower to sign the document
 * 
 * @param name - Full name of the signer
 * @param email - Email address of the signer
 * @param clientUserId - Unique client user ID (must match envelope creation)
 * @param returnUrl - URL to redirect after signing is complete
 */
export function makeRecipientViewRequest(
  name: string, 
  email: string, 
  clientUserId: string,
  returnUrl: string
) {
  const viewRequest = new docusign.RecipientViewRequest();

  viewRequest.returnUrl = returnUrl;
  viewRequest.authenticationMethod = 'none';

  // Recipient information must match embedded recipient info
  viewRequest.email = email;
  viewRequest.userName = name;
  viewRequest.clientUserId = clientUserId;

  return viewRequest;
}

/**
 * Create and send envelope for embedded signing flow
 * This is the main function that orchestrates the DocuSign flow
 * 
 * Flow:
 * 1. Creates and sends envelope with all 3 signers (iPay, Organization, Borrower)
 * 2. iPay uses recipient view to sign (embedded)
 * 3. Organization uses recipient view to sign (embedded)
 * 4. Borrower receives email to sign
 * 
 * Note: Envelope must be 'sent' status for recipient view to work
 * 
 * @param borrowerName - Full name of the borrower
 * @param borrowerEmail - Email address of the borrower
 * @param loanData - Pre-filled form field values
 * @param status - 'sent' to send immediately (default, required for recipient view), 'created' for draft
 * @param ipayEmail - Email address of the iPay representative (default: DEFAULT_IPAY_EMAIL)
 * @param organizationEmail - Email address of the organization representative (default: DEFAULT_ORGANIZATION_EMAIL)
 * @param organizationName - Full name of the organization representative (default: 'Organization Representative')
 */
export async function createAndSendEnvelope(
  borrowerName: string,
  borrowerEmail: string,
  loanData: Record<string, string>,
  status: 'created' | 'sent' = 'sent',
  ipayEmail: string = DEFAULT_IPAY_EMAIL,
  organizationEmail: string = DEFAULT_ORGANIZATION_EMAIL,
  organizationName: string = 'Organization Representative'
) {
  if (!API_ACCOUNT_ID) {
    throw new Error('Missing API_ACCOUNT_ID in environment variables');
  }

  try {
    // Step 1: Ensure we have a valid token
    await checkToken();

    // Step 2: Get EnvelopesApi instance
    const envelopesApi = await getEnvelopesApi();

    // Step 3: Create envelope with loan data and all 3 signers
    const envelope = makeEnvelope(borrowerName, borrowerEmail, loanData, status, ipayEmail, organizationEmail, organizationName);

    console.log(`📤 Creating ${status} envelope with 3 signers (embedded + email)...`);
    
    // Step 4: Create and send the envelope
    const results = await envelopesApi.createEnvelope(API_ACCOUNT_ID, {
      envelopeDefinition: envelope
    });

    console.log(`✅ Envelope ${status === 'created' ? 'created as draft' : 'created and sent'}:`, results.envelopeId);
    if (status === 'sent') {
      console.log('📝 iPay can now use recipient view to sign (embedded)');
      console.log('📝 Organization can use recipient view to sign (embedded) after iPay signs');
      console.log('📧 Borrower will receive email notification after Organization signs');
    } else {
      console.log('⚠️  Draft envelope created - must be sent before recipient view can be used');
    }
    console.log('🔗 View envelope in DocuSign:');
    const docusignWebUrl = process.env._URL || 'https://demo.docusign.net';
    console.log(`   ${docusignWebUrl}/documents/details/${results.envelopeId}`);


    return {
      envelopeId: results.envelopeId,
      status: results.status,
      uri: results.uri,
      statusDateTime: results.statusDateTime,
      docusignUrl: `${docusignWebUrl}/documents/details/${results.envelopeId}`
    };
  } catch (error: unknown) {
    console.error('❌ Failed to create envelope:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('Error details:', (error as { response?: { body?: unknown } }).response?.body);
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`DocuSign envelope creation failed: ${errorMessage}`);
  }
}

/**
 * Get envelope status
 */
export async function getEnvelopeStatus(envelopeId: string) {
  if (!API_ACCOUNT_ID) {
    throw new Error('Missing API_ACCOUNT_ID in environment variables');
  }

  try {
    const envelopesApi = await getEnvelopesApi();
    const envelope = await envelopesApi.getEnvelope(API_ACCOUNT_ID, envelopeId);
    
    return {
      status: envelope.status,
      sentDateTime: envelope.sentDateTime,
      completedDateTime: envelope.completedDateTime,
      envelopeId: envelope.envelopeId
    };
  } catch (error: unknown) {
    console.error('❌ Failed to get envelope status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get envelope status: ${errorMessage}`);
  }
}
