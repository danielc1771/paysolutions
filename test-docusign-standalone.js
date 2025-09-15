const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const docusign = require('docusign-esign');
const fs = require('fs');

// DocuSign configuration - using EXACT same variable names as in your code
const DOCUSIGN_BASE_PATH = process.env.DOCUSIGN_BASE_PATH;
const DOCUSIGN_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const DOCUSIGN_USER_ID = process.env.DOCUSIGN_USER_ID;
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
const DOCUSIGN_PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY;

console.log('🔍 Checking DocuSign Environment Variables:');
console.log('- DOCUSIGN_BASE_PATH:', DOCUSIGN_BASE_PATH ? '✅ Set' : '❌ Missing');
console.log('- DOCUSIGN_INTEGRATION_KEY:', DOCUSIGN_INTEGRATION_KEY ? `✅ Set (${DOCUSIGN_INTEGRATION_KEY.substring(0, 8)}...)` : '❌ Missing');
console.log('- DOCUSIGN_USER_ID:', DOCUSIGN_USER_ID ? `✅ Set (${DOCUSIGN_USER_ID.substring(0, 8)}...)` : '❌ Missing');
console.log('- DOCUSIGN_ACCOUNT_ID:', DOCUSIGN_ACCOUNT_ID ? `✅ Set (${DOCUSIGN_ACCOUNT_ID.substring(0, 8)}...)` : '❌ Missing');
console.log('- DOCUSIGN_PRIVATE_KEY:', DOCUSIGN_PRIVATE_KEY ? '✅ Set (length: ' + DOCUSIGN_PRIVATE_KEY.length + ')' : '❌ Missing');
console.log('');

async function authenticateWithJWT() {
  try {
    console.log('🔐 Starting DocuSign JWT authentication...');
    
    if (!DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_USER_ID || !DOCUSIGN_PRIVATE_KEY || !DOCUSIGN_BASE_PATH) {
      throw new Error('Missing required DocuSign environment variables');
    }

    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath(DOCUSIGN_BASE_PATH);

    // Convert private key string to Buffer
    const privateKey = Buffer.from(DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n'));
    console.log('🔑 Private key processed, length:', privateKey.length);
    
    const scopes = ['signature', 'impersonation'];
    const expiresIn = 3600; // 1 hour

    console.log('🚀 Requesting JWT token...');
    const result = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      scopes,
      privateKey,
      expiresIn
    );

    console.log('✅ JWT token received successfully');
    return result.body.access_token;
  } catch (error) {
    console.error('❌ DocuSign JWT authentication failed:', error.message);
    throw error;
  }
}

async function createTemplatesApi() {
  const accessToken = await authenticateWithJWT();
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(DOCUSIGN_BASE_PATH);
  apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

  if (!DOCUSIGN_ACCOUNT_ID) {
    throw new Error('DocuSign account ID is not configured');
  }
  
  return {
    templatesApi: new docusign.TemplatesApi(apiClient),
    accountId: DOCUSIGN_ACCOUNT_ID
  };
}

async function listDocuSignTemplates() {
  try {
    console.log('📋 Fetching DocuSign templates...');
    
    const { templatesApi, accountId } = await createTemplatesApi();
    
    const options = {
      count: '100',
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
    
  } catch (error) {
    console.error('❌ Error fetching DocuSign templates:', error.message);
    throw error;
  }
}

async function getTemplateTabs(templateId, templateName) {
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
    const allTabs = [];
    
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
          console.warn(`⚠️ Could not fetch tabs for recipient ${recipient.recipientId}:`, tabError.message);
        }
      }
    }
    
    console.log('✅ Template tabs retrieved successfully');
    
    return {
      templateId,
      templateName: templateName || 'Unknown',
      recipients: allTabs
    };
    
  } catch (error) {
    console.error('❌ Error fetching template tabs:', error.message);
    throw error;
  }
}

async function getTemplateTabsByName(templateName) {
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
    
  } catch (error) {
    console.error('❌ Error finding template by name:', error.message);
    throw error;
  }
}

// Main test function
async function main() {
  try {
    console.log('🚀 Starting DocuSign Template Tabs Test\n');

    // Step 1: List all templates
    console.log('📋 Step 1: Listing all templates...');
    const allTemplates = await listDocuSignTemplates();
    
    console.log(`\n✅ Found ${allTemplates.length} templates:`);
    allTemplates.forEach((template, index) => {
      console.log(`   ${index + 1}. ${template.name} (ID: ${template.templateId})`);
    });

    // Step 2: Try to find any template with 'ipay' or similar in the name
    let templateName = 'iPay - Acuerdo de Financiamento Personal';
    console.log(`\n📄 Step 2: Looking for template: "${templateName}"`);
    
    if (allTemplates.length === 0) {
      console.log('\n⚠️  No templates found in your DocuSign account!');
      console.log('\n📋 To continue, you need to:');
      console.log('1. Go to https://demo.docusign.net');
      console.log('2. Log in with your DocuSign developer account');
      console.log('3. Navigate to "Manage" → "Templates"');
      console.log('4. Create a new template called "iPay - Acuerdo de Financiamento Personal"');
      console.log('5. Upload your loan agreement PDF');
      console.log('6. Add a recipient role called "Borrower"');
      console.log('7. Add fillable fields to your PDF with labels like:');
      console.log('   - borrower_first_name, borrower_last_name, borrower_email');
      console.log('   - loan_amount, loan_term_weeks, vehicle_year, etc.');
      console.log('8. Save the template');
      console.log('\nThen run this script again to see the available fields!');
      return;
    }

    // Look for any templates that might match
    const possibleTemplates = allTemplates.filter(t => 
      t.name?.toLowerCase().includes('ipay') || 
      t.name?.toLowerCase().includes('acuerdo') ||
      t.name?.toLowerCase().includes('financiamento') ||
      t.name?.toLowerCase().includes('loan')
    );

    if (possibleTemplates.length > 0) {
      console.log(`\n🎯 Found ${possibleTemplates.length} possible matching template(s):`);
      possibleTemplates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name} (ID: ${template.templateId})`);
      });
      
      // Use the first matching template
      templateName = possibleTemplates[0].name;
      console.log(`\n📄 Using template: "${templateName}"`);
    }
    
    const templateTabs = await getTemplateTabsByName(templateName);

    // Step 3: Display results
    console.log('\n🎯 TEMPLATE TABS ANALYSIS');
    console.log('=' .repeat(50));
    console.log(`Template: ${templateTabs.templateName}`);
    console.log(`Template ID: ${templateTabs.templateId}`);
    console.log(`Number of Recipients: ${templateTabs.recipients.length}`);

    templateTabs.recipients.forEach((recipient, index) => {
      console.log(`\n👤 Recipient ${index + 1}:`);
      console.log(`   Role Name: ${recipient.roleName}`);
      console.log(`   Recipient ID: ${recipient.recipientId}`);
      
      // Count total tabs
      const tabCounts = {
        text: recipient.tabs.textTabs.length,
        checkbox: recipient.tabs.checkboxTabs.length,
        date: recipient.tabs.dateTabs.length,
        dateSigned: recipient.tabs.dateSignedTabs.length,
        email: recipient.tabs.emailTabs.length,
        number: recipient.tabs.numberTabs.length,
        signHere: recipient.tabs.signHereTabs.length,
        initialHere: recipient.tabs.initialHereTabs.length
      };

      console.log(`   Tab Summary:`);
      Object.entries(tabCounts).forEach(([type, count]) => {
        if (count > 0) console.log(`     - ${type}: ${count} tabs`);
      });

      // List all fillable tabs (excluding signature tabs)
      const fillableTabs = [
        ...recipient.tabs.textTabs,
        ...recipient.tabs.checkboxTabs, 
        ...recipient.tabs.dateTabs,
        ...recipient.tabs.emailTabs,
        ...recipient.tabs.numberTabs
      ];

      if (fillableTabs.length > 0) {
        console.log(`\n   📝 Fillable Fields (${fillableTabs.length} total):`);
        fillableTabs.forEach(tab => {
          const required = tab.required ? ' (Required)' : ' (Optional)';
          console.log(`     - ${tab.tabLabel || tab.name || 'Unnamed'} [${tab.tabType}]${required}`);
        });
      }
    });

    // Step 4: Create structured output for field mapping
    console.log('\n📊 STRUCTURED JSON OUTPUT FOR FIELD MAPPING');
    console.log('=' .repeat(50));
    
    const structuredOutput = {
      templateInfo: {
        templateId: templateTabs.templateId,
        templateName: templateTabs.templateName,
        totalRecipients: templateTabs.recipients.length
      },
      recipients: templateTabs.recipients.map(recipient => ({
        roleName: recipient.roleName,
        recipientId: recipient.recipientId,
        fillableFields: [
          ...recipient.tabs.textTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'text',
            required: tab.required,
            currentValue: tab.value
          })),
          ...recipient.tabs.emailTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'email', 
            required: tab.required,
            currentValue: tab.value
          })),
          ...recipient.tabs.numberTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'number',
            required: tab.required,
            currentValue: tab.value
          })),
          ...recipient.tabs.dateTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'date',
            required: tab.required,
            currentValue: tab.value
          })),
          ...recipient.tabs.checkboxTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'checkbox',
            required: tab.required,
            currentValue: tab.selected
          }))
        ],
        signatureFields: [
          ...recipient.tabs.signHereTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'signHere',
            required: tab.required
          })),
          ...recipient.tabs.initialHereTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'initialHere',
            required: tab.required
          })),
          ...recipient.tabs.dateSignedTabs.map(tab => ({
            tabLabel: tab.tabLabel,
            tabType: 'dateSigned',
            required: tab.required
          }))
        ]
      }))
    };

    console.log(JSON.stringify(structuredOutput, null, 2));

    // Save to file for easy reference
    fs.writeFileSync('./docusign-template-tabs-output.json', JSON.stringify(structuredOutput, null, 2));
    console.log('\n💾 Results saved to: docusign-template-tabs-output.json');
    
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the test
main();