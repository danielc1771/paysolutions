import 'server-only';
import docusign from 'docusign-esign';

// DocuSign configuration
const DOCUSIGN_BASE_PATH = process.env.DOCUSIGN_BASE_PATH;
const DOCUSIGN_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const DOCUSIGN_USER_ID = process.env.DOCUSIGN_USER_ID;
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
const DOCUSIGN_PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY;

// Create DocuSign API client
export const createDocuSignClient = () => {
  if (!DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_USER_ID || !DOCUSIGN_PRIVATE_KEY || !DOCUSIGN_BASE_PATH) {
    throw new Error('DocuSign environment variables are not configured');
  }

  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(DOCUSIGN_BASE_PATH);

  return apiClient;
};

// JWT Authentication
export const authenticateWithJWT = async (): Promise<string> => {
  try {
    console.log('🔐 Starting DocuSign JWT authentication...');
    
    // Validate environment variables
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
    const userId = process.env.DOCUSIGN_USER_ID;
    const privateKeyString = process.env.DOCUSIGN_PRIVATE_KEY;
    
    console.log('📋 Environment variables check:');
    console.log('- Integration Key:', integrationKey ? `${integrationKey.substring(0, 8)}...` : 'MISSING');
    console.log('- User ID:', userId ? `${userId.substring(0, 8)}...` : 'MISSING');
    console.log('- Private Key:', privateKeyString ? 'Present' : 'MISSING');
    
    if (!integrationKey || !userId || !privateKeyString) {
      throw new Error('Missing required DocuSign environment variables');
    }

    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath(DOCUSIGN_BASE_PATH!);

    // Convert private key string to Buffer
    const privateKey = Buffer.from(privateKeyString.replace(/\\n/g, '\n'));
    console.log('🔑 Private key processed, length:', privateKey.length);

    const scopes = ['signature', 'impersonation'];
    const expiresIn = 3600; // 1 hour

    console.log('🚀 Requesting JWT token...');
    const result = await apiClient.requestJWTUserToken(
      integrationKey,
      userId,
      scopes,
      privateKey,
      expiresIn
    );

    console.log('✅ JWT token received successfully');
    return result.body.access_token;
  } catch (error: unknown) {
    console.error('❌ DocuSign JWT authentication failed:');
    console.error('Error type:', error instanceof Error ? error.constructor.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('Full error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error && error.message?.includes('invalid_client')) {
      throw new Error('Invalid DocuSign Integration Key or User ID. Please check your credentials.');
    } else if (error instanceof Error && error.message?.includes('invalid_grant')) {
      throw new Error('Invalid private key or user consent required. Please check your RSA private key format.');
    } else if (error instanceof Error && error.message?.includes('consent_required')) {
      throw new Error('User consent required. Please grant consent in DocuSign Admin panel.');
    }
    
    throw new Error(`Failed to authenticate with DocuSign: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};


// Create EnvelopesApi instance
export const createEnvelopesApi = async () => {
  const accessToken = await authenticateWithJWT();
  const apiClient = createDocuSignClient();
  apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

  if (!DOCUSIGN_ACCOUNT_ID) {
    throw new Error('DocuSign account ID is not configured');
  }
  
  return {
    envelopesApi: new docusign.EnvelopesApi(apiClient),
    apiClient: apiClient,
    accountId: DOCUSIGN_ACCOUNT_ID
  };
};
