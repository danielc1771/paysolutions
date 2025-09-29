const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

console.log('🔍 DocuSign Configuration Diagnostic Tool');
console.log('==========================================\n');

// Check all environment variables
console.log('📋 Environment Variables Check:');
const requiredVars = [
  'DOCUSIGN_BASE_PATH',
  'DOCUSIGN_INTEGRATION_KEY', 
  'DOCUSIGN_USER_ID',
  'DOCUSIGN_ACCOUNT_ID',
  'DOCUSIGN_TEMPLATE_ID',
  'DOCUSIGN_CLIENT_USER_ID',
  'DOCUSIGN_PRIVATE_KEY'
];

let allVarsPresent = true;
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    if (varName === 'DOCUSIGN_PRIVATE_KEY') {
      console.log(`✅ ${varName}: Present (${value.length} characters)`);
      
      // Check private key format
      if (value.includes('-----BEGIN RSA PRIVATE KEY-----')) {
        console.log('   📝 Private key format: RSA Private Key (correct)');
      } else if (value.includes('-----BEGIN PRIVATE KEY-----')) {
        console.log('   ⚠️  Private key format: PKCS#8 (may need conversion)');
      } else {
        console.log('   ❌ Private key format: Unknown/Invalid');
      }
      
      // Check for proper newlines
      if (value.includes('\\n')) {
        console.log('   📝 Newlines: Using \\n format (correct for env var)');
      } else if (value.includes('\n')) {
        console.log('   📝 Newlines: Using actual newlines');
      } else {
        console.log('   ❌ Newlines: No newlines detected');
      }
    } else {
      // Mask sensitive values
      const maskedValue = varName.includes('KEY') || varName.includes('ID') ? 
        value.substring(0, 8) + '...' : value;
      console.log(`✅ ${varName}: ${maskedValue}`);
    }
  } else {
    console.log(`❌ ${varName}: Missing`);
    allVarsPresent = false;
  }
});

if (!allVarsPresent) {
  console.log('\n❌ Some environment variables are missing. Please check your .env.local file.');
  process.exit(1);
}

console.log('\n🔐 Private Key Analysis:');
const privateKeyString = process.env.DOCUSIGN_PRIVATE_KEY;
if (privateKeyString) {
  // Convert the private key to see if it's valid
  try {
    const privateKey = Buffer.from(privateKeyString.replace(/\\n/g, '\n'));
    const keyString = privateKey.toString();
    
    console.log('📝 Key length after conversion:', keyString.length);
    console.log('📝 Starts with:', keyString.substring(0, 50) + '...');
    console.log('📝 Ends with:', '...' + keyString.substring(keyString.length - 50));
    
    // Check if it's a valid PEM format
    if (keyString.includes('-----BEGIN') && keyString.includes('-----END')) {
      console.log('✅ PEM format appears valid');
    } else {
      console.log('❌ PEM format appears invalid');
    }
    
    // Check for common issues
    if (keyString.includes('\\n')) {
      console.log('⚠️  Warning: Still contains \\n after conversion');
    }
    
  } catch (error) {
    console.log('❌ Error processing private key:', error.message);
  }
}

console.log('\n🌐 DocuSign Environment Check:');
const basePath = process.env.DOCUSIGN_BASE_PATH;
if (basePath) {
  if (basePath.includes('demo')) {
    console.log('📍 Environment: Demo/Sandbox');
  } else if (basePath.includes('www.docusign.net')) {
    console.log('📍 Environment: Production');
  } else {
    console.log('📍 Environment: Custom/Unknown');
  }
}

console.log('\n💡 Common Issues and Solutions:');
console.log('1. Invalid Private Key Format:');
console.log('   - Ensure you\'re using RSA PRIVATE KEY format');
console.log('   - Use \\n for line breaks in environment variables');
console.log('   - Make sure the key includes BEGIN and END markers');

console.log('\n2. User Consent Required:');
console.log('   - Visit: https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=' + process.env.DOCUSIGN_INTEGRATION_KEY + '&redirect_uri=http://localhost:3000/');
console.log('   - Grant consent for your integration');

console.log('\n3. Integration Key Issues:');
console.log('   - Verify the integration key is correct');
console.log('   - Ensure it\'s configured for JWT authentication');
console.log('   - Check that the public key is uploaded to DocuSign');

console.log('\n4. User ID Issues:');
console.log('   - Verify the User ID (GUID format)');
console.log('   - Ensure the user exists in your DocuSign account');

console.log('\n🔧 Next Steps:');
console.log('1. If private key format looks wrong, regenerate the key pair');
console.log('2. If user consent is needed, visit the consent URL above');
console.log('3. Verify your DocuSign Developer Account settings');
console.log('4. Check DocuSign Admin panel for integration status');

console.log('\n📋 Current Configuration Summary:');
console.log(`Base Path: ${process.env.DOCUSIGN_BASE_PATH}`);
console.log(`Integration Key: ${process.env.DOCUSIGN_INTEGRATION_KEY?.substring(0, 8)}...`);
console.log(`User ID: ${process.env.DOCUSIGN_USER_ID?.substring(0, 8)}...`);
console.log(`Account ID: ${process.env.DOCUSIGN_ACCOUNT_ID?.substring(0, 8)}...`);
console.log(`Template ID: ${process.env.DOCUSIGN_TEMPLATE_ID?.substring(0, 8)}...`);
console.log(`Client User ID: ${process.env.DOCUSIGN_CLIENT_USER_ID}`);
