import 'server-only';
import * as docusign from 'docusign-esign';
import * as fs from 'fs';
import * as path from 'path';

// DocuSign JWT Configuration
const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const USER_ID = process.env.DOCUSIGN_USER_ID;
const BASE_PATH = process.env.DOCUSIGN_BASE_PATH;
const TEMPLATE_ID = process.env.TEMPLATE_ID;
const API_ACCOUNT_ID = process.env.API_ACCOUNT_ID;
const OAUTH_SCOPE = 'signature';

// Default signer emails
// TODO: store this in DB
// const IPAY_EMAIL = 'jhoamadrian@gmail.com';
// const ORGANIZATION_EMAIL = 'jgarcia@easycarus.com';

const IPAY_EMAIL = 'architex.development@gmail.com';
const ORGANIZATION_EMAIL = 'architex.development@gmail.com';

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
 * Signing Order (all via email):
 * 1. iPay (jhoamadrian@gmail.com)
 * 2. Borrower (from application)
 * 3. Organization (jgarcia@easycarus.com)
 */
export function makeEnvelope(
  borrowerName: string, 
  borrowerEmail: string, 
  tabValues?: Record<string, string>
) {
  if (!TEMPLATE_ID) {
    throw new Error('Missing TEMPLATE_ID in environment variables');
  }

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

  // Signer 1: iPay (Routing Order 1) - Embedded signing (dashboard) + email notification
  const iPay = new docusign.TemplateRole();
  iPay.email = IPAY_EMAIL;
  iPay.name = 'iPay Representative';
  iPay.roleName = 'iPay';
  Object.assign(iPay, {
    routingOrder: '1',
    // Add clientUserId for embedded signing capability while still sending emails
    clientUserId: INTEGRATION_KEY
  });
  // Attach all pre-filled tabs to iPay role (they review all information first)
  if (tabs) {
    iPay.tabs = tabs;
  }

  // Signer 2: Borrower (Routing Order 2) - Email notification only
  const borrower = new docusign.TemplateRole();
  borrower.email = borrowerEmail;
  borrower.name = borrowerName;
  borrower.roleName = 'Borrower';
  Object.assign(borrower, {
    routingOrder: '2',
    // Add clientUserId for potential embedded signing
    clientUserId: INTEGRATION_KEY
  });
  // NO tabs - borrower only signs, doesn't fill out fields

  // Signer 3: Organization (Routing Order 3) - Embedded signing (dashboard) + email notification
  const organization = new docusign.TemplateRole();
  organization.email = ORGANIZATION_EMAIL;
  organization.name = 'Organization Representative';
  organization.roleName = 'Organization';
  Object.assign(organization, {
    routingOrder: '3',
    // Add clientUserId for embedded signing capability
    clientUserId: INTEGRATION_KEY
  });

  // Add all three template roles in order
  env.templateRoles = [iPay, borrower, organization];
  env.status = 'sent';

  console.log('📋 Envelope created with 3 signers (all via email):');
  console.log('  1. iPay:', IPAY_EMAIL, '(will receive email first)');
  console.log('  2. Borrower:', borrowerEmail, '(will receive email after iPay signs)');
  console.log('  3. Organization:', ORGANIZATION_EMAIL, '(will receive email after Borrower signs)');

  return env;
}

/**
 * Create recipient view request for embedded signing
 * This generates the URL for the borrower to sign the document
 */
export function makeRecipientViewRequest(name: string, email: string, returnUrl: string) {
  if (!INTEGRATION_KEY) {
    throw new Error('Missing INTEGRATION_KEY in environment variables');
  }

  const viewRequest = new docusign.RecipientViewRequest();

  viewRequest.returnUrl = returnUrl;
  viewRequest.authenticationMethod = 'none';

  // Recipient information must match embedded recipient info
  viewRequest.email = email;
  viewRequest.userName = name;
  viewRequest.clientUserId = INTEGRATION_KEY; // Using INTEGRATION_KEY as CLIENT_USER_ID per your instruction

  return viewRequest;
}

/**
 * Create and send envelope to all three signers via email
 * This is the main function that orchestrates the DocuSign flow
 * 
 * Flow:
 * 1. Creates envelope with all 3 signers (iPay, Borrower, Organization)
 * 2. All signers receive email notifications in sequential order
 * 3. No embedded signing - all done via email links
 */
export async function createAndSendEnvelope(
  borrowerName: string,
  borrowerEmail: string,
  loanData: Record<string, string>
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
    const envelope = makeEnvelope(borrowerName, borrowerEmail, loanData);

    console.log('📤 Creating envelope with 3 signers (all via email)...');
    
    // Step 4: Create and send the envelope
    const results = await envelopesApi.createEnvelope(API_ACCOUNT_ID, {
      envelopeDefinition: envelope
    });

    console.log('✅ Envelope created and sent:', results.envelopeId);
    console.log('📧 iPay will receive email notification immediately');
    console.log('📧 Borrower will receive email notification after iPay signs');
    console.log('📧 Organization will receive email notification after Borrower signs');
    console.log('');
    console.log('🔗 View envelope in DocuSign:');
    console.log(`   https://demo.docusign.net/documents/details/${results.envelopeId}`);
    console.log('');

    return {
      envelopeId: results.envelopeId,
      status: results.status,
      uri: results.uri,
      statusDateTime: results.statusDateTime,
      docusignUrl: `https://demo.docusign.net/documents/details/${results.envelopeId}`
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
