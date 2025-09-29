const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const jwt = require('jsonwebtoken');

console.log('🔍 JWT Debug Analysis');
console.log('====================\n');

const INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const USER_ID = process.env.DOCUSIGN_USER_ID;
const PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY;

console.log('📋 Environment Check:');
console.log(`Integration Key: ${INTEGRATION_KEY}`);
console.log(`User ID: ${USER_ID}`);
console.log(`Private Key Present: ${!!PRIVATE_KEY}`);

// Convert private key
const privateKey = PRIVATE_KEY.replace(/\\n/g, '\n');

// Test different JWT configurations
const now = Math.floor(Date.now() / 1000);

console.log('\n🧪 Testing Different JWT Configurations...\n');

// Test 1: Basic configuration (current)
console.log('Test 1: Current Configuration');
try {
  const payload1 = {
    iss: INTEGRATION_KEY,
    sub: USER_ID,
    aud: 'account-d.docusign.com',
    iat: now,
    exp: now + 3600,
    scope: 'signature'
  };
  
  const token1 = jwt.sign(payload1, privateKey, { 
    algorithm: 'RS256',
    header: { alg: 'RS256', typ: 'JWT' }
  });
  
  console.log('✅ Token created successfully');
  console.log(`Length: ${token1.length}`);
  
  // Decode and verify
  const decoded1 = jwt.decode(token1, { complete: true });
  console.log('Payload:', JSON.stringify(decoded1.payload, null, 2));
  
} catch (error) {
  console.log('❌ Failed:', error.message);
}

// Test 2: With impersonation scope
console.log('\nTest 2: With Impersonation Scope');
try {
  const payload2 = {
    iss: INTEGRATION_KEY,
    sub: USER_ID,
    aud: 'account-d.docusign.com',
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation'
  };
  
  const token2 = jwt.sign(payload2, privateKey, { 
    algorithm: 'RS256',
    header: { alg: 'RS256', typ: 'JWT' }
  });
  
  console.log('✅ Token created successfully');
  console.log(`Length: ${token2.length}`);
  
} catch (error) {
  console.log('❌ Failed:', error.message);
}

// Test 3: Different audience
console.log('\nTest 3: Different Audience Format');
try {
  const payload3 = {
    iss: INTEGRATION_KEY,
    sub: USER_ID,
    aud: 'https://account-d.docusign.com',
    iat: now,
    exp: now + 3600,
    scope: 'signature'
  };
  
  const token3 = jwt.sign(payload3, privateKey, { 
    algorithm: 'RS256',
    header: { alg: 'RS256', typ: 'JWT' }
  });
  
  console.log('✅ Token created successfully');
  console.log(`Length: ${token3.length}`);
  
} catch (error) {
  console.log('❌ Failed:', error.message);
}

// Test 4: Check private key format
console.log('\n🔐 Private Key Analysis:');
console.log(`Key starts with: ${privateKey.substring(0, 30)}...`);
console.log(`Key ends with: ...${privateKey.substring(privateKey.length - 30)}`);
console.log(`Contains BEGIN marker: ${privateKey.includes('-----BEGIN RSA PRIVATE KEY-----')}`);
console.log(`Contains END marker: ${privateKey.includes('-----END RSA PRIVATE KEY-----')}`);
console.log(`Line count: ${privateKey.split('\n').length}`);

// Test 5: Verify key can be used for signing
console.log('\n🧪 Key Signing Test:');
try {
  const testPayload = { test: 'data', iat: now };
  const testToken = jwt.sign(testPayload, privateKey, { algorithm: 'RS256' });
  const verified = jwt.decode(testToken);
  console.log('✅ Private key can sign tokens');
  console.log('Test payload verified:', verified.test === 'data');
} catch (error) {
  console.log('❌ Private key signing failed:', error.message);
}

console.log('\n💡 Diagnosis:');
console.log('If all tests pass but DocuSign returns invalid_request:');
console.log('1. Consent may not be properly granted');
console.log('2. Integration key may not have JWT grant enabled');
console.log('3. User ID may not match the consenting user');
console.log('4. Private key may not match the public key in DocuSign');

console.log('\n🔧 Recommended Actions:');
console.log('1. Verify JWT Grant is enabled in DocuSign admin');
console.log('2. Ensure the User ID matches the account that granted consent');
console.log('3. Check that the public key in DocuSign matches this private key');
console.log('4. Try revoking and re-granting consent');
