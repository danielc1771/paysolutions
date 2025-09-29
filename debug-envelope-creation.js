const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const { getEnvelopesApi, createEnvelope, setTokenData } = require('./src/utils/docusign/client.ts');

console.log('🔍 Debug DocuSign Envelope Creation');
console.log('===================================\n');

// Use the tokens from your successful authorization
// You'll need to get these from the browser or set them manually
const mockTokenData = {
  access_token: 'your_access_token_here', // You'll need to replace this
  refresh_token: 'your_refresh_token_here',
  expires_at: Date.now() + 28800000 // 8 hours from now
};

async function debugEnvelopeCreation() {
  try {
    console.log('📋 Environment Check:');
    console.log(`Template ID: ${process.env.DOCUSIGN_TEMPLATE_ID}`);
    console.log(`Account ID: ${process.env.DOCUSIGN_ACCOUNT_ID}`);
    console.log(`Client User ID: ${process.env.DOCUSIGN_CLIENT_USER_ID}`);
    
    // Test data
    const testData = {
      borrowerName: 'John Smith',
      borrowerEmail: 'john.smith@example.com',
      loanAmount: 15000,
      vehicleYear: '2020',
      vehicleMake: 'Toyota',
      vehicleModel: 'Camry',
      vehicleVin: '1HGBH41JXMN109186',
      dealershipName: 'PaySolutions Auto'
    };
    
    console.log('\n📝 Test Data:', JSON.stringify(testData, null, 2));
    
    // Create envelope definition
    const envelope = createEnvelope(testData);
    console.log('\n📤 Envelope Definition:', JSON.stringify(envelope, null, 2));
    
    console.log('\n⚠️  To complete this test:');
    console.log('1. Get your access token from the browser network tab');
    console.log('2. Replace mockTokenData.access_token above');
    console.log('3. Run this script again');
    
  } catch (error) {
    console.error('❌ Error creating envelope definition:', error);
  }
}

debugEnvelopeCreation();
