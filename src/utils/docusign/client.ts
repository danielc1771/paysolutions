import 'server-only';
import * as docusign from 'docusign-esign';

// DocuSign configuration - Authorization Code Grant
const DOCUSIGN_BASE_PATH = process.env.DOCUSIGN_BASE_PATH;
const DOCUSIGN_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const DOCUSIGN_CLIENT_SECRET = process.env.DOCUSIGN_CLIENT_SECRET;
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
const DOCUSIGN_TEMPLATE_ID = process.env.DOCUSIGN_TEMPLATE_ID;
const DOCUSIGN_CLIENT_USER_ID = process.env.DOCUSIGN_CLIENT_USER_ID;

// Token storage interface
interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// In-memory token storage (for simplicity - in production, use secure storage)
let tokenData: TokenData | null = null;

// Generate authorization URL for user consent
export const getAuthorizationUrl = (redirectUri: string, state?: string): string => {
  if (!DOCUSIGN_INTEGRATION_KEY) {
    throw new Error('Missing DOCUSIGN_INTEGRATION_KEY');
  }

  const baseUrl = 'https://account-d.docusign.com/oauth/auth';
  const params = new URLSearchParams({
    response_type: 'code',
    scope: 'signature',
    client_id: DOCUSIGN_INTEGRATION_KEY,
    redirect_uri: redirectUri,
    ...(state && { state })
  });

  return `${baseUrl}?${params.toString()}`;
};

// Exchange authorization code for access token
export const exchangeCodeForToken = async (authorizationCode: string, redirectUri: string): Promise<TokenData> => {
  if (!DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_CLIENT_SECRET) {
    throw new Error('Missing DocuSign configuration for Authorization Code Grant');
  }

  try {
    const response = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: redirectUri,
        client_id: DOCUSIGN_INTEGRATION_KEY,
        client_secret: DOCUSIGN_CLIENT_SECRET
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token exchange failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    tokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in - 60) * 1000 // Subtract 60s for safety
    };

    console.log('✅ Access token received successfully');
    return tokenData;
  } catch (error) {
    console.error('❌ DocuSign token exchange failed:', error);
    throw new Error(`Failed to exchange code for token: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};

// Refresh access token using refresh token
export const refreshAccessToken = async (): Promise<string> => {
  if (!tokenData?.refresh_token || !DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_CLIENT_SECRET) {
    throw new Error('Missing refresh token or DocuSign configuration');
  }

  try {
    const response = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
        client_id: DOCUSIGN_INTEGRATION_KEY,
        client_secret: DOCUSIGN_CLIENT_SECRET
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token refresh failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    tokenData = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokenData.refresh_token, // Some providers don't return new refresh token
      expires_at: Date.now() + (data.expires_in - 60) * 1000
    };

    console.log('✅ Access token refreshed successfully');
    return tokenData.access_token;
  } catch (error) {
    console.error('❌ DocuSign token refresh failed:', error);
    throw new Error(`Failed to refresh token: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};

// Get valid access token (refresh if needed)
export const getAccessToken = async (): Promise<string> => {
  if (!tokenData) {
    throw new Error('No token data available. Please authenticate first.');
  }

  // Check if token is still valid
  if (Date.now() < tokenData.expires_at) {
    console.log('🔄 Re-using existing access token');
    return tokenData.access_token;
  }

  // Token expired, refresh it
  console.log('🔄 Refreshing expired access token');
  return await refreshAccessToken();
};

// Set token data (for when you have tokens from elsewhere)
export const setTokenData = (tokens: TokenData): void => {
  tokenData = tokens;
};

// Get EnvelopesApi instance
export const getEnvelopesApi = async () => {
  const token = await getAccessToken();
  
  if (!DOCUSIGN_BASE_PATH || !DOCUSIGN_ACCOUNT_ID) {
    throw new Error('Missing DocuSign configuration');
  }

  const dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(DOCUSIGN_BASE_PATH);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + token);
  
  return {
    envelopesApi: new docusign.EnvelopesApi(dsApiClient),
    accountId: DOCUSIGN_ACCOUNT_ID
  };
};

// Create envelope using template
export const createEnvelope = (loanData: {
  borrowerName: string;
  borrowerEmail: string;
  loanAmount: number;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  dealershipName?: string;
  [key: string]: unknown;
}) => {
  if (!DOCUSIGN_TEMPLATE_ID || !DOCUSIGN_CLIENT_USER_ID) {
    throw new Error('Missing DocuSign template configuration');
  }

  const env = new (docusign as any).EnvelopeDefinition();
  env.templateId = DOCUSIGN_TEMPLATE_ID;

  // Create text tabs for loan data
  const textTabs = [];
  
  // Add loan amount
  if (loanData.loanAmount) {
    textTabs.push((docusign as any).Text.constructFromObject({
      tabLabel: 'loan_amount',
      value: loanData.loanAmount.toString()
    }));
  }
  
  // Add vehicle information if available
  if (loanData.vehicleYear) {
    textTabs.push((docusign as any).Text.constructFromObject({
      tabLabel: 'vehicle_year',
      value: loanData.vehicleYear
    }));
  }
  
  if (loanData.vehicleMake) {
    textTabs.push((docusign as any).Text.constructFromObject({
      tabLabel: 'vehicle_make',
      value: loanData.vehicleMake
    }));
  }
  
  if (loanData.vehicleModel) {
    textTabs.push((docusign as any).Text.constructFromObject({
      tabLabel: 'vehicle_model',
      value: loanData.vehicleModel
    }));
  }
  
  if (loanData.vehicleVin) {
    textTabs.push((docusign as any).Text.constructFromObject({
      tabLabel: 'vehicle_vin',
      value: loanData.vehicleVin
    }));
  }
  
  if (loanData.dealershipName) {
    textTabs.push((docusign as any).Text.constructFromObject({
      tabLabel: 'dealership_name',
      value: loanData.dealershipName
    }));
  }

  // Create tabs object
  const tabs = (docusign as any).Tabs.constructFromObject({
    textTabs: textTabs
  });

  // Create borrower signer
  const borrowerSigner = (docusign as any).TemplateRole.constructFromObject({
    email: loanData.borrowerEmail,
    name: loanData.borrowerName,
    tabs: tabs,
    clientUserId: DOCUSIGN_CLIENT_USER_ID,
    roleName: 'Borrower'
  });

  env.templateRoles = [borrowerSigner];
  env.status = 'sent';

  return env;
};

// Create recipient view for embedded signing
export const createRecipientViewRequest = (borrowerName: string, borrowerEmail: string, returnUrl: string) => {
  if (!DOCUSIGN_CLIENT_USER_ID) {
    throw new Error('Missing DocuSign client user ID');
  }

  const viewRequest = new (docusign as any).RecipientViewRequest();
  viewRequest.returnUrl = returnUrl;
  viewRequest.authenticationMethod = 'none';
  viewRequest.email = borrowerEmail;
  viewRequest.userName = borrowerName;
  viewRequest.clientUserId = DOCUSIGN_CLIENT_USER_ID;

  return viewRequest;
};
