/**
 * Test DocuSign JWT Authentication
 * 
 * This script tests the JWT authentication to help diagnose issues.
 * Run with: npx tsx scripts/test-docusign-auth.ts
 */

import * as docusign from 'docusign-esign';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const INTEGRATION_KEY = process.env.INTEGRATION_KEY;
const USER_ID = process.env.USER_ID;
const BASE_PATH = process.env.BASE_PATH;
const API_ACCOUNT_ID = process.env.API_ACCOUNT_ID;

console.log('🔍 DocuSign JWT Authentication Test\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 Configuration Check:');
console.log(`   INTEGRATION_KEY: ${INTEGRATION_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   USER_ID: ${USER_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`   BASE_PATH: ${BASE_PATH ? '✅ Set' : '❌ Missing'}`);
console.log(`   API_ACCOUNT_ID: ${API_ACCOUNT_ID ? '✅ Set' : '❌ Missing'}\n`);

if (!INTEGRATION_KEY || !USER_ID || !BASE_PATH) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Check private key
const privateKeyPath = path.join(process.cwd(), 'private.key');
console.log('🔑 Private Key Check:');
console.log(`   Path: ${privateKeyPath}`);

if (!fs.existsSync(privateKeyPath)) {
  console.error('   ❌ private.key file not found\n');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
console.log(`   ✅ File exists (${privateKey.length} bytes)`);
console.log(`   ✅ Starts with: ${privateKey.substring(0, 30)}...`);
console.log(`   ✅ Ends with: ...${privateKey.substring(privateKey.length - 30)}\n`);

// Test JWT token generation
async function testJWT() {
  console.log('🚀 Testing JWT Token Generation...\n');

  try {
    const dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(BASE_PATH!);

    console.log('   📤 Requesting JWT token...');
    console.log(`   Integration Key: ${INTEGRATION_KEY}`);
    console.log(`   User ID: ${USER_ID}`);
    console.log(`   Base Path: ${BASE_PATH}\n`);

    const results = await dsApiClient.requestJWTUserToken(
      INTEGRATION_KEY!,
      USER_ID!,
      'signature',
      privateKey,
      3600
    );

    console.log('✅ JWT Token Generated Successfully!\n');
    console.log('📋 Token Details:');
    console.log(`   Access Token: ${results.body.access_token.substring(0, 50)}...`);
    console.log(`   Expires In: ${results.body.expires_in} seconds`);
    console.log(`   Token Type: ${results.body.token_type}\n`);

    // Test getting user info
    console.log('🔍 Testing API Access...\n');
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
    
    const accountsApi = new docusign.AccountsApi(dsApiClient);
    const accountInfo = await accountsApi.getUserInfo(results.body.access_token);

    console.log('✅ API Access Successful!\n');
    console.log('📋 User Info:');
    console.log(`   Name: ${accountInfo.name}`);
    console.log(`   Email: ${accountInfo.email}`);
    console.log(`   Accounts: ${accountInfo.accounts?.length || 0}\n`);

    if (accountInfo.accounts && accountInfo.accounts.length > 0) {
      console.log('📋 Available Accounts:');
      accountInfo.accounts.forEach((account, index) => {
        console.log(`   ${index + 1}. ${account.accountName}`);
        console.log(`      Account ID: ${account.accountId}`);
        console.log(`      Base URI: ${account.baseUri}`);
        console.log(`      Is Default: ${account.isDefault ? 'Yes' : 'No'}\n`);
      });

      // Check if API_ACCOUNT_ID matches
      const matchingAccount = accountInfo.accounts.find(acc => acc.accountId === API_ACCOUNT_ID);
      if (matchingAccount) {
        console.log(`✅ API_ACCOUNT_ID matches account: ${matchingAccount.accountName}\n`);
      } else {
        console.log(`⚠️  API_ACCOUNT_ID (${API_ACCOUNT_ID}) doesn't match any account\n`);
        console.log('💡 Use one of the Account IDs listed above\n');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Your DocuSign JWT authentication is working correctly');
    console.log('✅ You can now test the envelope creation\n');

  } catch (error: any) {
    console.error('❌ JWT Token Generation Failed!\n');
    console.error('Error Details:');
    console.error(`   Message: ${error.message}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Body:`, error.response.body);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 TROUBLESHOOTING STEPS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (error.response?.status === 400) {
      console.log('❌ 400 Error - Common Causes:\n');
      console.log('1. User Consent Not Granted (First Time Setup)');
      console.log('   👉 Visit this URL in your browser to grant consent:');
      console.log(`   https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${INTEGRATION_KEY}&redirect_uri=https://www.docusign.com\n`);
      console.log('2. Private Key Mismatch');
      console.log('   👉 Verify the private key in private.key matches the public key in DocuSign\n');
      console.log('3. Incorrect Integration Key or User ID');
      console.log('   👉 Double-check these values in DocuSign Admin → Apps and Keys\n');
    }

    if (error.response?.status === 401) {
      console.log('❌ 401 Error - Authentication Failed:\n');
      console.log('   👉 Check that your Integration Key and User ID are correct\n');
    }

    process.exit(1);
  }
}

// Run the test
testJWT()
  .then(() => {
    console.log('✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
