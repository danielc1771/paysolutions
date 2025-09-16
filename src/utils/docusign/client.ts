import 'server-only';
import * as docusign from 'docusign-esign';

// Type declarations for DocuSign classes
interface ApiClient {
  setBasePath(basePath: string): void;
  addDefaultHeader(name: string, value: string): void;
  requestJWTUserToken(
    integrationKey: string,
    userId: string,
    scopes: string[],
    privateKey: Buffer,
    expiresIn: number
  ): Promise<{ body: { access_token: string } }>;
}

interface EnvelopesApi {
  createEnvelope(accountId: string, options: unknown): Promise<{
    envelopeId?: string;
    status?: string;
    statusDateTime?: string;
    uri?: string;
  }>;
  createRecipientView(accountId: string, envelopeId: string, options: unknown): Promise<{
    url?: string;
  }>;
  getEnvelope(accountId: string, envelopeId: string, options?: unknown): Promise<{
    envelopeId?: string;
    status?: string;
    statusDateTime?: string;
    statusChangedDateTime?: string;
    emailSubject?: string;
    documentsUri?: string;
    recipientsUri?: string;
    created?: string;
    lastModified?: string;
    sentDateTime?: string;
    completedDateTime?: string;
    voidedDateTime?: string;
    deliveredDateTime?: string;
    initialSentDateTime?: string;
  }>;
}

interface TemplatesApi {
  listTemplates(accountId: string, options?: unknown): Promise<{
    envelopeTemplates?: Array<{
      templateId?: string;
      name?: string;
      description?: string;
      shared?: string;
      created?: string;
      lastModified?: string;
      owner?: unknown;
    }>;
  }>;
  listRecipients(accountId: string, templateId: string): Promise<{
    signers?: Array<{
      recipientId?: string;
      roleName?: string;
      name?: string;
    }>;
  }>;
  listTabs(accountId: string, templateId: string, recipientId: string): Promise<{
    textTabs?: Array<{
      tabLabel?: string;
      name?: string;
      value?: string;
      required?: string;
      xPosition?: string;
      yPosition?: string;
      width?: string;
      height?: string;
      pageNumber?: string;
      documentId?: string;
    }>;
    checkboxTabs?: Array<{
      tabLabel?: string;
      name?: string;
      selected?: string;
      required?: string;
      xPosition?: string;
      yPosition?: string;
      pageNumber?: string;
      documentId?: string;
    }>;
    dateSignedTabs?: Array<{
      tabLabel?: string;
      name?: string;
      required?: string;
      xPosition?: string;
      yPosition?: string;
      pageNumber?: string;
      documentId?: string;
    }>;
    dateTabs?: Array<{
      tabLabel?: string;
      name?: string;
      value?: string;
      required?: string;
      xPosition?: string;
      yPosition?: string;
      pageNumber?: string;
      documentId?: string;
    }>;
    emailTabs?: Array<{
      tabLabel?: string;
      name?: string;
      value?: string;
      required?: string;
      xPosition?: string;
      yPosition?: string;
      pageNumber?: string;
      documentId?: string;
    }>;
    numberTabs?: Array<{
      tabLabel?: string;
      name?: string;
      value?: string;
      required?: string;
      xPosition?: string;
      yPosition?: string;
      pageNumber?: string;
      documentId?: string;
    }>;
    signHereTabs?: Array<{
      tabLabel?: string;
      name?: string;
      required?: string;
      xPosition?: string;
      yPosition?: string;
      pageNumber?: string;
      documentId?: string;
    }>;
    initialHereTabs?: Array<{
      tabLabel?: string;
      name?: string;
      required?: string;
      xPosition?: string;
      yPosition?: string;
      pageNumber?: string;
      documentId?: string;
    }>;
  }>;
}

// Type assertion for the DocuSign module
const DocuSignApiClient = (docusign as unknown as { ApiClient: new() => ApiClient }).ApiClient;
const DocuSignEnvelopesApi = (docusign as unknown as { EnvelopesApi: new(client: ApiClient) => EnvelopesApi }).EnvelopesApi;
const DocuSignTemplatesApi = (docusign as unknown as { TemplatesApi: new(client: ApiClient) => TemplatesApi }).TemplatesApi;

// Type for DocuSign module with class constructors
interface DocuSignModule {
  Text: unknown;
  EnvelopeDefinition: new () => {
    templateId?: string;
    emailSubject?: string;
    templateRoles?: unknown[];
    status?: string;
    documents?: unknown[];
    recipients?: unknown;
  };
  Document: unknown;
  Signer: unknown;
  Recipients: unknown;
  Tabs: unknown;
  TemplateRole: {
    constructFromObject: (obj: {
      email?: string;
      name?: string;
      roleName?: string;
      tabs?: unknown;
    }) => unknown;
  };
}

// Export DocuSign classes for use in other files
export const DocuSignClasses = {
  Text: (docusign as unknown as DocuSignModule).Text,
  EnvelopeDefinition: (docusign as unknown as DocuSignModule).EnvelopeDefinition,
  Document: (docusign as unknown as DocuSignModule).Document,
  Signer: (docusign as unknown as DocuSignModule).Signer,
  Recipients: (docusign as unknown as DocuSignModule).Recipients,
  Tabs: (docusign as unknown as DocuSignModule).Tabs,
  TemplateRole: (docusign as unknown as DocuSignModule).TemplateRole
};

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

  const apiClient = new DocuSignApiClient();
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

    const apiClient = new DocuSignApiClient();
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
    envelopesApi: new DocuSignEnvelopesApi(apiClient),
    apiClient: apiClient,
    accountId: DOCUSIGN_ACCOUNT_ID
  };
};

// Create TemplatesApi instance
export const createTemplatesApi = async () => {
  const accessToken = await authenticateWithJWT();
  const apiClient = createDocuSignClient();
  apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

  if (!DOCUSIGN_ACCOUNT_ID) {
    throw new Error('DocuSign account ID is not configured');
  }
  
  return {
    templatesApi: new DocuSignTemplatesApi(apiClient),
    apiClient: apiClient,
    accountId: DOCUSIGN_ACCOUNT_ID
  };
};

// List all templates in the account
export const listDocuSignTemplates = async () => {
  try {
    console.log('📋 Fetching DocuSign templates...');
    
    const { templatesApi, accountId } = await createTemplatesApi();
    
    const options = {
      count: '100', // Get up to 100 templates
      order: 'desc',
      orderBy: 'modified'
    };
    
    const result = await templatesApi.listTemplates(accountId, options);
    
    console.log('✅ Templates retrieved successfully');
    
    return result.envelopeTemplates?.map(template => ({
      templateId: template.templateId,
      name: template.name,
      description: template.description,
      shared: template.shared,
      created: template.created,
      lastModified: template.lastModified,
      owner: template.owner
    })) || [];
    
  } catch (error: unknown) {
    console.error('❌ Error fetching DocuSign templates:', error);
    throw new Error(`Failed to fetch templates: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};

// Get template tabs for a specific template
export const getTemplateTabs = async (templateId: string, templateName?: string) => {
  try {
    console.log(`📄 Fetching tabs for template: ${templateName || templateId}`);
    
    const { templatesApi, accountId } = await createTemplatesApi();
    
    // Get template recipients first to understand the roles
    const recipientsResult = await templatesApi.listRecipients(accountId, templateId);
    const recipients = recipientsResult.signers || [];
    
    console.log('👥 Template recipients found:', recipients.map(r => ({ 
      roleName: r.roleName, 
      recipientId: r.recipientId 
    })));
    
    // Get tabs for each recipient
    interface RecipientTabs {
      recipientId: string;
      roleName?: string;
      recipientName?: string;
      tabs: {
        textTabs: Array<{
          tabLabel?: string;
          name?: string;
          value?: string;
          required?: string;
          tabType: string;
          xPosition?: string;
          yPosition?: string;
          width?: string;
          height?: string;
          pageNumber?: string;
          documentId?: string;
        }>;
        checkboxTabs: Array<{
          tabLabel?: string;
          name?: string;
          selected?: string;
          required?: string;
          tabType: string;
          xPosition?: string;
          yPosition?: string;
          pageNumber?: string;
          documentId?: string;
        }>;
        dateSignedTabs: Array<{
          tabLabel?: string;
          name?: string;
          required?: string;
          tabType: string;
          xPosition?: string;
          yPosition?: string;
          pageNumber?: string;
          documentId?: string;
        }>;
        dateTabs: Array<{
          tabLabel?: string;
          name?: string;
          value?: string;
          required?: string;
          tabType: string;
          xPosition?: string;
          yPosition?: string;
          pageNumber?: string;
          documentId?: string;
        }>;
        emailTabs: Array<{
          tabLabel?: string;
          name?: string;
          value?: string;
          required?: string;
          tabType: string;
          xPosition?: string;
          yPosition?: string;
          pageNumber?: string;
          documentId?: string;
        }>;
        numberTabs: Array<{
          tabLabel?: string;
          name?: string;
          value?: string;
          required?: string;
          tabType: string;
          xPosition?: string;
          yPosition?: string;
          pageNumber?: string;
          documentId?: string;
        }>;
        signHereTabs: Array<{
          tabLabel?: string;
          name?: string;
          required?: string;
          tabType: string;
          xPosition?: string;
          yPosition?: string;
          pageNumber?: string;
          documentId?: string;
        }>;
        initialHereTabs: Array<{
          tabLabel?: string;
          name?: string;
          required?: string;
          tabType: string;
          xPosition?: string;
          yPosition?: string;
          pageNumber?: string;
          documentId?: string;
        }>;
      };
    }
    
    const allTabs: RecipientTabs[] = [];
    
    for (const recipient of recipients) {
      if (recipient.recipientId) {
        try {
          const tabsResult = await templatesApi.listTabs(accountId, templateId, recipient.recipientId);
          
          // Organize tabs by type
          const recipientTabs = {
            recipientId: recipient.recipientId,
            roleName: recipient.roleName,
            recipientName: recipient.name,
            tabs: {
              textTabs: (tabsResult.textTabs || []).map(tab => ({
                tabLabel: tab.tabLabel,
                name: tab.name,
                value: tab.value,
                required: tab.required,
                tabType: 'text',
                xPosition: tab.xPosition,
                yPosition: tab.yPosition,
                width: tab.width,
                height: tab.height,
                pageNumber: tab.pageNumber,
                documentId: tab.documentId
              })),
              checkboxTabs: (tabsResult.checkboxTabs || []).map(tab => ({
                tabLabel: tab.tabLabel,
                name: tab.name,
                selected: tab.selected,
                required: tab.required,
                tabType: 'checkbox',
                xPosition: tab.xPosition,
                yPosition: tab.yPosition,
                pageNumber: tab.pageNumber,
                documentId: tab.documentId
              })),
              dateSignedTabs: (tabsResult.dateSignedTabs || []).map(tab => ({
                tabLabel: tab.tabLabel,
                name: tab.name,
                required: tab.required,
                tabType: 'dateSigned',
                xPosition: tab.xPosition,
                yPosition: tab.yPosition,
                pageNumber: tab.pageNumber,
                documentId: tab.documentId
              })),
              dateTabs: (tabsResult.dateTabs || []).map(tab => ({
                tabLabel: tab.tabLabel,
                name: tab.name,
                value: tab.value,
                required: tab.required,
                tabType: 'date',
                xPosition: tab.xPosition,
                yPosition: tab.yPosition,
                pageNumber: tab.pageNumber,
                documentId: tab.documentId
              })),
              emailTabs: (tabsResult.emailTabs || []).map(tab => ({
                tabLabel: tab.tabLabel,
                name: tab.name,
                value: tab.value,
                required: tab.required,
                tabType: 'email',
                xPosition: tab.xPosition,
                yPosition: tab.yPosition,
                pageNumber: tab.pageNumber,
                documentId: tab.documentId
              })),
              numberTabs: (tabsResult.numberTabs || []).map(tab => ({
                tabLabel: tab.tabLabel,
                name: tab.name,
                value: tab.value,
                required: tab.required,
                tabType: 'number',
                xPosition: tab.xPosition,
                yPosition: tab.yPosition,
                pageNumber: tab.pageNumber,
                documentId: tab.documentId
              })),
              signHereTabs: (tabsResult.signHereTabs || []).map(tab => ({
                tabLabel: tab.tabLabel,
                name: tab.name,
                required: tab.required,
                tabType: 'signHere',
                xPosition: tab.xPosition,
                yPosition: tab.yPosition,
                pageNumber: tab.pageNumber,
                documentId: tab.documentId
              })),
              initialHereTabs: (tabsResult.initialHereTabs || []).map(tab => ({
                tabLabel: tab.tabLabel,
                name: tab.name,
                required: tab.required,
                tabType: 'initialHere',
                xPosition: tab.xPosition,
                yPosition: tab.yPosition,
                pageNumber: tab.pageNumber,
                documentId: tab.documentId
              }))
            }
          };
          
          allTabs.push(recipientTabs);
          
        } catch (tabError) {
          console.warn(`⚠️ Could not fetch tabs for recipient ${recipient.recipientId}:`, tabError);
        }
      }
    }
    
    console.log('✅ Template tabs retrieved successfully');
    
    return {
      templateId,
      templateName: templateName || 'Unknown',
      recipients: allTabs
    };
    
  } catch (error: unknown) {
    console.error('❌ Error fetching template tabs:', error);
    throw new Error(`Failed to fetch template tabs: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};

// Find template by name and get its tabs
export const getTemplateTabsByName = async (templateName: string) => {
  try {
    console.log(`🔍 Searching for template: "${templateName}"`);
    
    // First, get all templates
    const templates = await listDocuSignTemplates();
    
    // Find the template by name
    const template = templates.find(t => t.name?.toLowerCase().includes(templateName.toLowerCase()));
    
    if (!template || !template.templateId) {
      throw new Error(`Template "${templateName}" not found`);
    }
    
    console.log(`✅ Found template: ${template.name} (ID: ${template.templateId})`);
    
    // Get the tabs for this template
    return await getTemplateTabs(template.templateId, template.name);
    
  } catch (error: unknown) {
    console.error('❌ Error finding template by name:', error);
    throw new Error(`Failed to find template "${templateName}": ${error instanceof Error ? error.message : 'Unknown'}`);
  }
};
