const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

// Import DocuSign functions (we'll simulate them since we're using ES modules)
const docusign = require('docusign-esign');

// Sample loan application data (similar to what your form collects)
const sampleLoanData = {
  // Borrower information
  borrowerName: "John Smith",
  borrowerEmail: "john.smith@example.com",
  
  // Loan details
  loanAmount: 15000,
  
  // Vehicle information
  vehicleYear: "2020",
  vehicleMake: "Toyota",
  vehicleModel: "Camry",
  vehicleVin: "1HGBH41JXMN109186",
  
  // Dealership
  dealershipName: "PaySolutions Auto"
};

// DocuSign configuration
const DOCUSIGN_BASE_PATH = process.env.DOCUSIGN_BASE_PATH;
const DOCUSIGN_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const DOCUSIGN_USER_ID = process.env.DOCUSIGN_USER_ID;
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
const DOCUSIGN_TEMPLATE_ID = process.env.DOCUSIGN_TEMPLATE_ID;
const DOCUSIGN_CLIENT_USER_ID = process.env.DOCUSIGN_CLIENT_USER_ID;

// In-memory token storage
let accessToken = null;
let tokenExpiresAt = 0;

// Check and refresh token if needed
async function checkToken() {
  if (accessToken && Date.now() < tokenExpiresAt) {
    console.log('🔄 Re-using existing access token');
    return accessToken;
  }

  console.log('🔐 Generating new access token');
  
  if (!DOCUSIGN_INTEGRATION_KEY || !DOCUSIGN_USER_ID || !DOCUSIGN_BASE_PATH) {
    throw new Error('Missing required DocuSign environment variables');
  }

  const dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(DOCUSIGN_BASE_PATH);

  try {
    // Get private key from environment variable
    const privateKeyString = process.env.DOCUSIGN_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('DOCUSIGN_PRIVATE_KEY environment variable is not set');
    }
    
    // Convert private key string to Buffer (replace \\n with actual newlines)
    const privateKey = Buffer.from(privateKeyString.replace(/\\n/g, '\n'));
    
    const results = await dsApiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      ['signature'],
      privateKey,
      3600
    );

    console.log('✅ JWT token received successfully');
    accessToken = results.body.access_token;
    tokenExpiresAt = Date.now() + (results.body.expires_in - 60) * 1000;
    
    return accessToken;
  } catch (error) {
    console.error('❌ DocuSign JWT authentication failed:', error);
    throw new Error(`Failed to authenticate with DocuSign: ${error.message}`);
  }
}

// Get EnvelopesApi instance
async function getEnvelopesApi() {
  const token = await checkToken();
  
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
}

// Create envelope using template
function createEnvelope(loanData) {
  if (!DOCUSIGN_TEMPLATE_ID || !DOCUSIGN_CLIENT_USER_ID) {
    throw new Error('Missing DocuSign template configuration');
  }

  const env = new docusign.EnvelopeDefinition();
  env.templateId = DOCUSIGN_TEMPLATE_ID;

  // Create text tabs for loan data
  const textTabs = [];
  
  // Add loan amount
  if (loanData.loanAmount) {
    textTabs.push(docusign.Text.constructFromObject({
      tabLabel: 'loan_amount',
      value: loanData.loanAmount.toString()
    }));
  }
  
  // Add vehicle information if available
  if (loanData.vehicleYear) {
    textTabs.push(docusign.Text.constructFromObject({
      tabLabel: 'vehicle_year',
      value: loanData.vehicleYear
    }));
  }
  
  if (loanData.vehicleMake) {
    textTabs.push(docusign.Text.constructFromObject({
      tabLabel: 'vehicle_make',
      value: loanData.vehicleMake
    }));
  }
  
  if (loanData.vehicleModel) {
    textTabs.push(docusign.Text.constructFromObject({
      tabLabel: 'vehicle_model',
      value: loanData.vehicleModel
    }));
  }
  
  if (loanData.vehicleVin) {
    textTabs.push(docusign.Text.constructFromObject({
      tabLabel: 'vehicle_vin',
      value: loanData.vehicleVin
    }));
  }
  
  if (loanData.dealershipName) {
    textTabs.push(docusign.Text.constructFromObject({
      tabLabel: 'dealership_name',
      value: loanData.dealershipName
    }));
  }

  // Create tabs object
  const tabs = docusign.Tabs.constructFromObject({
    textTabs: textTabs
  });

  // Create borrower signer
  const borrowerSigner = docusign.TemplateRole.constructFromObject({
    email: loanData.borrowerEmail,
    name: loanData.borrowerName,
    tabs: tabs,
    clientUserId: DOCUSIGN_CLIENT_USER_ID,
    roleName: 'Borrower'
  });

  env.templateRoles = [borrowerSigner];
  env.status = 'sent';

  return env;
}

// Create recipient view for embedded signing
function createRecipientViewRequest(borrowerName, borrowerEmail, returnUrl) {
  if (!DOCUSIGN_CLIENT_USER_ID) {
    throw new Error('Missing DocuSign client user ID');
  }

  const viewRequest = new docusign.RecipientViewRequest();
  viewRequest.returnUrl = returnUrl;
  viewRequest.authenticationMethod = 'none';
  viewRequest.email = borrowerEmail;
  viewRequest.userName = borrowerName;
  viewRequest.clientUserId = DOCUSIGN_CLIENT_USER_ID;

  return viewRequest;
}

// Main test function
async function testDocuSignIntegration() {
  console.log('🧪 Starting DocuSign Integration Test');
  console.log('📋 Sample Loan Data:', JSON.stringify(sampleLoanData, null, 2));
  
  try {
    // Step 1: Check environment variables
    console.log('\n📝 Checking environment variables...');
    const requiredVars = [
      'DOCUSIGN_BASE_PATH',
      'DOCUSIGN_INTEGRATION_KEY', 
      'DOCUSIGN_USER_ID',
      'DOCUSIGN_ACCOUNT_ID',
      'DOCUSIGN_TEMPLATE_ID',
      'DOCUSIGN_CLIENT_USER_ID',
      'DOCUSIGN_PRIVATE_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }
    console.log('✅ All environment variables are set');
    
    // Step 2: Test authentication
    console.log('\n🔐 Testing DocuSign authentication...');
    await checkToken();
    console.log('✅ Authentication successful');
    
    // Step 3: Get EnvelopesApi
    console.log('\n📡 Getting DocuSign API client...');
    const { envelopesApi, accountId } = await getEnvelopesApi();
    console.log('✅ API client ready');
    
    // Step 4: Create envelope
    console.log('\n📄 Creating DocuSign envelope...');
    const envelope = createEnvelope(sampleLoanData);
    console.log('✅ Envelope definition created');
    
    // Step 5: Send envelope to DocuSign
    console.log('\n📤 Sending envelope to DocuSign...');
    const result = await envelopesApi.createEnvelope(accountId, {
      envelopeDefinition: envelope
    });
    
    if (!result || !result.envelopeId) {
      throw new Error('Failed to create DocuSign envelope - no envelope ID returned');
    }
    
    console.log('✅ DocuSign envelope created successfully!');
    console.log('📧 Envelope ID:', result.envelopeId);
    console.log('📊 Status:', result.status);
    
    // Step 6: Create recipient view (embedded signing URL)
    console.log('\n🔗 Creating embedded signing URL...');
    const viewRequest = createRecipientViewRequest(
      sampleLoanData.borrowerName,
      sampleLoanData.borrowerEmail,
      'http://localhost:3000/success' // Return URL after signing
    );
    
    const viewResult = await envelopesApi.createRecipientView(accountId, result.envelopeId, {
      recipientViewRequest: viewRequest
    });
    
    console.log('✅ Embedded signing URL created!');
    console.log('🌐 Signing URL:', viewResult.url);
    
    // Summary
    console.log('\n🎉 TEST COMPLETED SUCCESSFULLY!');
    console.log('📋 Summary:');
    console.log(`   • Envelope ID: ${result.envelopeId}`);
    console.log(`   • Status: ${result.status}`);
    console.log(`   • Borrower: ${sampleLoanData.borrowerName} (${sampleLoanData.borrowerEmail})`);
    console.log(`   • Loan Amount: $${sampleLoanData.loanAmount.toLocaleString()}`);
    console.log(`   • Vehicle: ${sampleLoanData.vehicleYear} ${sampleLoanData.vehicleMake} ${sampleLoanData.vehicleModel}`);
    console.log(`   • Signing URL: ${viewResult.url}`);
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Open the signing URL in a browser to test the embedded signing');
    console.log('   2. Check your DocuSign account to see the envelope');
    console.log('   3. Verify that all form fields are populated correctly');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('DocuSign API Response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data || error.response.body
      });
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Verify all environment variables are correctly set in .env.local');
    console.log('   2. Check that your DocuSign template exists and has the correct field labels');
    console.log('   3. Ensure your DocuSign integration key has the correct permissions');
    console.log('   4. Verify that user consent has been granted for your integration');
    
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testDocuSignIntegration();
}

module.exports = {
  testDocuSignIntegration,
  sampleLoanData
};
