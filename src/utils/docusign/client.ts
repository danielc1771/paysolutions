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
    templatesApi: new (docusign as any).TemplatesApi(dsApiClient),
    accountId: DOCUSIGN_ACCOUNT_ID
  };
};

// Get template tabs for mapping
export const getTemplateTabs = async (templateId: string) => {
  const { templatesApi, accountId } = await getEnvelopesApi();
  
  try {
    console.log(`🔍 Fetching tabs for template: ${templateId}`);
    console.log(`Account ID: ${accountId}`);
    
    // Try different approaches to get template tabs
    let result;
    
    try {
      // Method 1: Try with the Borrower recipient ID (from template test results)
      result = await templatesApi.listTabs(accountId, templateId, '98804236');
      console.log('✅ Template tabs retrieved with Borrower recipient ID');
    } catch (error1) {
      console.log('⚠️ Method 1 failed, trying to find correct recipient ID...');
      
      try {
        // Method 2: Get template recipients and find the Borrower role
        const recipients = await templatesApi.listRecipients(accountId, templateId);
        console.log('Template recipients:', JSON.stringify(recipients, null, 2));
        
        if (recipients.signers && recipients.signers.length > 0) {
          // Look for the Borrower role first, then fall back to first signer
          let borrowerRecipient = recipients.signers.find((s: any) => s.roleName === 'Borrower');
          if (!borrowerRecipient) {
            borrowerRecipient = recipients.signers[0];
          }
          
          const recipientId = borrowerRecipient.recipientId;
          console.log(`Using recipient ID: ${recipientId} (role: ${borrowerRecipient.roleName})`);
          result = await templatesApi.listTabs(accountId, templateId, recipientId);
          console.log('✅ Template tabs retrieved with dynamic recipient ID');
        } else {
          throw new Error('No signers found in template');
        }
      } catch (error2) {
        console.log('⚠️ Method 2 failed, trying template info...');
        
        // Method 3: Get template info to understand structure
        const templateInfo = await templatesApi.get(accountId, templateId);
        console.log('Template info:', JSON.stringify(templateInfo, null, 2));
        
        throw new Error(`All methods failed. Template info retrieved but tabs not accessible.`);
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ Failed to get template tabs:', error);
    
    // Log detailed error information
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as any;
      console.error('API Error Details:', {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data
      });
    }
    
    throw new Error(`Failed to get template tabs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Extract all tab labels from template
export const extractTabLabels = async (templateId: string): Promise<string[]> => {
  const tabs = await getTemplateTabs(templateId);
  const labels: string[] = [];
  
  // Extract labels from different tab types
  if (tabs.textTabs) {
    tabs.textTabs.forEach((tab: any) => {
      if (tab.tabLabel) labels.push(tab.tabLabel);
    });
  }
  
  if (tabs.numberTabs) {
    tabs.numberTabs.forEach((tab: any) => {
      if (tab.tabLabel) labels.push(tab.tabLabel);
    });
  }
  
  if (tabs.dateTabs) {
    tabs.dateTabs.forEach((tab: any) => {
      if (tab.tabLabel) labels.push(tab.tabLabel);
    });
  }
  
  if (tabs.checkboxTabs) {
    tabs.checkboxTabs.forEach((tab: any) => {
      if (tab.tabLabel) labels.push(tab.tabLabel);
    });
  }
  
  console.log(`📋 Found ${labels.length} tab labels:`, labels);
  return labels;
};

// Loan application data interface - Updated to match template requirements
interface LoanApplicationData {
  // Borrower information
  borrowerName: string;
  borrowerEmail: string;
  borrowerFirstName?: string;
  borrowerLastName?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  
  // Employment information
  employmentStatus?: string;
  annualIncome?: number;
  currentEmployerName?: string;
  employerState?: string;
  timeWithEmployment?: string;
  
  // Loan information
  loanAmount: number;
  loanType?: string;
  loanTerm?: string;
  interestRate?: string;
  monthlyPayment?: number;
  
  // Vehicle information
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  vehicleMileage?: string;
  vehiclePrice?: number;
  
  // Dealership information
  dealershipName?: string;
  dealershipAddress?: string;
  dealershipPhone?: string;
  
  // References (with country codes as template requires)
  reference1Name?: string;
  reference1Phone?: string;
  reference1Email?: string;
  reference1CountryCode?: string;
  reference2Name?: string;
  reference2Phone?: string;
  reference2Email?: string;
  reference2CountryCode?: string;
  reference3Name?: string;
  reference3Phone?: string;
  reference3Email?: string;
  
  // Additional fields
  [key: string]: unknown;
}

// Tab mapping configuration - Complete mapping for all template tab labels
const TAB_MAPPING: Record<string, string> = {
  // Borrower information tabs (matching ALL actual template labels)
  'borrower_first_name': 'borrowerFirstName',
  'borrower_last_name': 'borrowerLastName',
  'borrower_address_line_1': 'address',
  'borrower_city': 'city',
  'borrower_state': 'state',
  'borrower_zip_code': 'zipCode',
  'borrower_country': 'country',
  'borrower_phone_number': 'phoneNumber',
  'borrower_phone_country_code': 'phoneCountryCode',
  
  // Employment tabs
  'borrower_employer': 'currentEmployerName',
  'borrower_employer_state': 'employerState',
  'borrower_employed_time': 'timeWithEmployment',
  
  // Loan tabs
  'loan_type': 'loanType',
  
  // Reference tabs (exact field names from template analysis)
  'borrower_reference_name_1 _phone': 'reference1Phone',
  'borrower_reference_name_1 _country_code': 'reference1CountryCode',
  'borrower_reference_name_2_phone': 'reference2Phone',
  'borrower_reference_name_2_country_code': 'reference2CountryCode',
  
  // Legacy mappings (in case some old field names exist)
  'borrower_name': 'borrowerName',
  'date_of_birth': 'dateOfBirth',
  'address': 'address',
  'city': 'city',
  'state': 'state',
  'zip_code': 'zipCode',
  'phone_number': 'phoneNumber',
  'employment_status': 'employmentStatus',
  'annual_income': 'annualIncome',
  'employer_name': 'currentEmployerName',
  'time_with_employment': 'timeWithEmployment',
  'loan_amount': 'loanAmount',
  'loan_term': 'loanTerm',
  'interest_rate': 'interestRate',
  'monthly_payment': 'monthlyPayment',
  'vehicle_year': 'vehicleYear',
  'vehicle_make': 'vehicleMake',
  'vehicle_model': 'vehicleModel',
  'vehicle_vin': 'vehicleVin',
  'vehicle_mileage': 'vehicleMileage',
  'vehicle_price': 'vehiclePrice',
  'dealership_name': 'dealershipName',
  'dealership_address': 'dealershipAddress',
  'dealership_phone': 'dealershipPhone',
  'reference1_name': 'reference1Name',
  'reference1_phone': 'reference1Phone',
  'reference1_email': 'reference1Email',
  'reference2_name': 'reference2Name',
  'reference2_phone': 'reference2Phone',
  'reference2_email': 'reference2Email',
  'reference3_name': 'reference3Name',
  'reference3_phone': 'reference3Phone',
  'reference3_email': 'reference3Email'
};

// Map loan data to template tabs
export const mapLoanDataToTabs = (loanData: LoanApplicationData, availableTabLabels: string[]) => {
  const textTabs: any[] = [];
  const numberTabs: any[] = [];
  const dateTabs: any[] = [];
  
  console.log('🗺️ Mapping loan data to template tabs...');
  console.log('Available tab labels:', availableTabLabels);
  console.log('Available loan data fields:', Object.keys(loanData));
  
  // Debug: Show all mappings
  console.log('📋 Current TAB_MAPPING:');
  Object.entries(TAB_MAPPING).forEach(([tabLabel, dataField]) => {
    if (availableTabLabels.includes(tabLabel)) {
      const hasData = loanData[dataField] !== undefined && loanData[dataField] !== null;
      console.log(`  ${tabLabel} -> ${dataField}: ${hasData ? '✅ HAS DATA' : '❌ NO DATA'}`);
    }
  });
  
  // Iterate through available tab labels and map data
  availableTabLabels.forEach(tabLabel => {
    const dataField = TAB_MAPPING[tabLabel];
    
    // Debug: Show exact tab label being processed
    console.log(`🔍 Processing tab: "${tabLabel}" -> mapping: "${dataField}"`);
    
    if (dataField && loanData[dataField] !== undefined && loanData[dataField] !== null) {
      const value = loanData[dataField];
      
      console.log(`📝 Mapping ${tabLabel} -> ${dataField}: ${value}`);
      
      // Determine tab type based on data type and field name
      if (typeof value === 'number' || dataField.includes('income') || dataField.includes('amount') || dataField.includes('payment') || dataField.includes('price')) {
        numberTabs.push((docusign as any).Number.constructFromObject({
          tabLabel: tabLabel,
          value: value.toString()
        }));
      } else if (dataField.includes('date') || dataField === 'dateOfBirth') {
        dateTabs.push((docusign as any).Date.constructFromObject({
          tabLabel: tabLabel,
          value: value.toString()
        }));
      } else {
        textTabs.push((docusign as any).Text.constructFromObject({
          tabLabel: tabLabel,
          value: value.toString()
        }));
      }
    } else if (dataField) {
      console.log(`⚠️ No data found for tab: ${tabLabel} (field: ${dataField}) - data value: ${loanData[dataField]}`);
    } else {
      console.log(`⚠️ No mapping found for tab: ${tabLabel}`);
    }
  });
  
  console.log(`✅ Mapped ${textTabs.length} text tabs, ${numberTabs.length} number tabs, ${dateTabs.length} date tabs`);
  
  return {
    textTabs: textTabs.length > 0 ? textTabs : undefined,
    numberTabs: numberTabs.length > 0 ? numberTabs : undefined,
    dateTabs: dateTabs.length > 0 ? dateTabs : undefined
  };
};

// Create envelope using template with dynamic tab mapping
export const createEnvelope = async (loanData: LoanApplicationData): Promise<any> => {
  if (!DOCUSIGN_TEMPLATE_ID || !DOCUSIGN_CLIENT_USER_ID) {
    throw new Error('Missing DocuSign template configuration');
  }

  const env = new (docusign as any).EnvelopeDefinition();
  env.templateId = DOCUSIGN_TEMPLATE_ID;

  // Get available tab labels from template
  const availableTabLabels = await extractTabLabels(DOCUSIGN_TEMPLATE_ID);
  
  // Map loan data to template tabs dynamically
  const mappedTabs = mapLoanDataToTabs(loanData, availableTabLabels);

  // Create tabs object with mapped data - handle undefined arrays
  const tabsData = {
    textTabs: mappedTabs.textTabs || [],
    numberTabs: mappedTabs.numberTabs || [],
    dateTabs: mappedTabs.dateTabs || []
  };
  
  console.log('📋 Final tabs data:', JSON.stringify(tabsData, null, 2));
  const tabs = (docusign as any).Tabs.constructFromObject(tabsData);

  // Create borrower signer with correct recipient ID
  const borrowerSigner = (docusign as any).TemplateRole.constructFromObject({
    email: loanData.borrowerEmail,
    name: loanData.borrowerName,
    tabs: tabs,
    clientUserId: DOCUSIGN_CLIENT_USER_ID,
    roleName: 'Borrower'
    // Note: Don't set recipientId here for template roles, DocuSign handles this automatically
  });
  
  console.log('📋 Template role created:', JSON.stringify(borrowerSigner, null, 2));

  env.templateRoles = [borrowerSigner];
  env.status = 'sent';
  
  console.log('📦 Final envelope definition:', JSON.stringify({
    templateId: env.templateId,
    status: env.status,
    templateRoles: env.templateRoles?.length || 0
  }, null, 2));

  return env;
};

// Interface for makeEnvelope arguments
interface MakeEnvelopeArgs {
  signerEmail: string;
  signerName: string;
  ccEmail?: string;
  ccName?: string;
  templateId: string;
}

// Interface for sendEnvelopeFromTemplate arguments
interface SendEnvelopeArgs {
  basePath: string;
  accessToken: string;
  accountId: string;
  envelopeArgs: MakeEnvelopeArgs;
}

// Create envelope definition from template (following DocuSign documentation)
export const makeEnvelope = (args: MakeEnvelopeArgs): any => {
  // Create the envelope definition
  const env = new (docusign as any).EnvelopeDefinition();
  env.templateId = args.templateId;

  // Create template role elements to connect the signer and cc recipients to the template
  const signer1 = (docusign as any).TemplateRole.constructFromObject({
    email: args.signerEmail,
    name: args.signerName,
    roleName: 'signer',
  });

  const templateRoles = [signer1];

  // Add CC recipient if provided
  if (args.ccEmail && args.ccName) {
    const cc1 = new (docusign as any).TemplateRole();
    cc1.email = args.ccEmail;
    cc1.name = args.ccName;
    cc1.roleName = 'cc';
    templateRoles.push(cc1);
  }

  // Add the TemplateRole objects to the envelope object
  env.templateRoles = templateRoles;
  env.status = 'sent'; // We want the envelope to be sent

  return env;
};

// Send envelope from template (following DocuSign documentation)
export const sendEnvelopeFromTemplate = async (args: SendEnvelopeArgs) => {
  const dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(args.basePath);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + args.accessToken);
  const envelopesApi = new docusign.EnvelopesApi(dsApiClient);

  // Make the envelope request body
  const envelope = makeEnvelope(args.envelopeArgs);

  // Call the Envelopes::create API method
  // Exceptions will be caught by the calling function
  const results = await envelopesApi.createEnvelope(args.accountId, {
    envelopeDefinition: envelope,
  });

  return results;
};

// Convenience function to send envelope using existing configuration
export const sendEnvelopeWithConfig = async (
  signerEmail: string,
  signerName: string,
  templateId?: string,
  ccEmail?: string,
  ccName?: string
) => {
  if (!DOCUSIGN_BASE_PATH || !DOCUSIGN_ACCOUNT_ID) {
    throw new Error('Missing DocuSign configuration');
  }

  const accessToken = await getAccessToken();
  const finalTemplateId = templateId || DOCUSIGN_TEMPLATE_ID;

  if (!finalTemplateId) {
    throw new Error('No template ID provided and no default template configured');
  }

  const args: SendEnvelopeArgs = {
    basePath: DOCUSIGN_BASE_PATH,
    accessToken,
    accountId: DOCUSIGN_ACCOUNT_ID,
    envelopeArgs: {
      signerEmail,
      signerName,
      ccEmail,
      ccName,
      templateId: finalTemplateId,
    },
  };

  return await sendEnvelopeFromTemplate(args);
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
