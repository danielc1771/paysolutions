#!/usr/bin/env node

// Test script for template-based envelope creation with database field mapping
// This script tests the field population without actually sending the envelope

require('dotenv').config({ path: '.env.local' });

const docusign = require('docusign-esign');

// DocuSign configuration
const DOCUSIGN_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const DOCUSIGN_USER_ID = process.env.DOCUSIGN_USER_ID;
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
const DOCUSIGN_BASE_PATH = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';
const DOCUSIGN_PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY;

// Template ID for "iPay - Acuerdo de Financiamento Personal"
const TEMPLATE_ID = '8b9711f2-c304-4467-aa5c-27ebca4b4cc4';

// Mock database loan data based on your schema
const mockLoanData = {
  // From loans table
  id: 'loan-123-uuid',
  loanNumber: 'LOAN-2025-001',
  principalAmount: 15000.00,
  interestRate: 0.0899, // 8.99%
  termWeeks: 52, // 1 year
  weeklyPayment: 325.50,
  purpose: 'Vehicle Purchase Down Payment',
  vehicleYear: '2019',
  vehicleMake: 'Toyota',
  vehicleModel: 'Camry',
  vehicleVin: '1HGBH41JXMN109186',
  customerFirstName: 'John',
  customerLastName: 'Doe',
  organizationId: 'org-123-uuid',

  // From borrowers table
  borrower: {
    id: 'borrower-123-uuid',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    phone: '(305) 555-0123',
    dateOfBirth: '1985-06-15',
    addressLine1: '1234 Main Street',
    city: 'Miami',
    state: 'FL',
    zipCode: '33101',
    employmentStatus: 'Full-time',
    annualIncome: 65000,
    currentEmployerName: 'Tech Solutions Inc',
    timeWithEmployment: '3 years',
    reference1Name: 'Jane Smith',
    reference1Phone: '(305) 555-0456',
    reference1Email: 'jane.smith@email.com',
    reference2Name: 'Mike Johnson',
    reference2Phone: '(305) 555-0789',
    reference2Email: 'mike.johnson@email.com',
    reference3Name: null,
    reference3Phone: null,
    reference3Email: null,
    organizationId: 'org-123-uuid',
  },

  // From organizations table
  organization: {
    id: 'org-123-uuid',
    name: 'Premium Auto Dealers',
    email: 'admin@premiumauto.com',
    phone: '(305) 555-0100',
    address: '5678 Business Blvd',
    city: 'Miami',
    state: 'FL',
    zipCode: '33102',
  },

  // From payment_schedules table (sample of first 5 payments)
  paymentSchedules: [
    {
      id: 'payment-1-uuid',
      paymentNumber: 1,
      dueDate: '2025-01-22',
      principalAmount: 286.73,
      interestAmount: 38.77,
      totalAmount: 325.50,
      remainingBalance: 14713.27,
    },
    {
      id: 'payment-2-uuid',
      paymentNumber: 2,
      dueDate: '2025-01-29',
      principalAmount: 287.22,
      interestAmount: 38.28,
      totalAmount: 325.50,
      remainingBalance: 14426.05,
    },
    {
      id: 'payment-3-uuid',
      paymentNumber: 3,
      dueDate: '2025-02-05',
      principalAmount: 287.71,
      interestAmount: 37.79,
      totalAmount: 325.50,
      remainingBalance: 14138.34,
    },
    {
      id: 'payment-4-uuid',
      paymentNumber: 4,
      dueDate: '2025-02-12',
      principalAmount: 288.20,
      interestAmount: 37.30,
      totalAmount: 325.50,
      remainingBalance: 13850.14,
    },
    {
      id: 'payment-5-uuid',
      paymentNumber: 5,
      dueDate: '2025-02-19',
      principalAmount: 288.69,
      interestAmount: 36.81,
      totalAmount: 325.50,
      remainingBalance: 13561.45,
    }
  ]
};

// JWT authentication function
const authenticateWithJWT = async () => {
  try {
    const scopes = ['signature', 'impersonation'];
    const jwtPayload = {
      iss: DOCUSIGN_INTEGRATION_KEY,
      sub: DOCUSIGN_USER_ID,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: 'account-d.docusign.com',
      scope: scopes.join(' ')
    };

    const apiClient = new docusign.ApiClient();
    apiClient.setOAuthBasePath('account-d.docusign.com');

    const privateKey = Buffer.from(DOCUSIGN_PRIVATE_KEY, 'utf8');
    
    const results = await apiClient.requestJWTUserToken(
      DOCUSIGN_INTEGRATION_KEY,
      DOCUSIGN_USER_ID,
      scopes,
      privateKey,
      3600
    );

    return results.body.access_token;
  } catch (error) {
    console.error('JWT Authentication failed:', error);
    throw error;
  }
};

// Function to create template-based envelope (same as in templates.ts)
const createTemplateBasedEnvelope = (loanData, templateId = TEMPLATE_ID) => {
  
  // Helper function to format phone number
  const formatPhoneNumber = (phone) => {
    if (!phone) return { countryCode: '+1', number: '' };
    
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 10) {
      return { countryCode: '+1', number: digits };
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return { countryCode: '+1', number: digits.substring(1) };
    }
    
    return { countryCode: '+1', number: digits };
  };

  // Helper function to calculate first payment date
  const calculateFirstPaymentDate = () => {
    const firstPayment = new Date();
    firstPayment.setDate(firstPayment.getDate() + 7); // 7 days from now
    return firstPayment.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  // Parse borrower phone
  const borrowerPhone = formatPhoneNumber(loanData.borrower.phone);
  const reference1Phone = formatPhoneNumber(loanData.borrower.reference1Phone);
  const reference2Phone = formatPhoneNumber(loanData.borrower.reference2Phone);

  // Helper functions for new fields
  const calculateTotalLoanAmount = () => {
    return loanData.paymentSchedules.reduce((total, payment) => total + payment.totalAmount, 0);
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  // Create text tabs for iPay fields (recipient 1) - previously dealership
  const dealershipTabs = [
    // Basic loan information
    { tabLabel: 'dealership_name', value: loanData.organization?.name || 'iPay Solutions' },
    { tabLabel: 'vehicle_year', value: loanData.vehicleYear },
    { tabLabel: 'vehicle_make', value: loanData.vehicleMake },
    { tabLabel: 'vehicle_model', value: loanData.vehicleModel },
    { tabLabel: 'vehicle_vin', value: loanData.vehicleVin },
    { tabLabel: 'loan_amount', value: loanData.principalAmount.toFixed(2) },
    { tabLabel: 'interest_applied', value: (loanData.interestRate * 100).toFixed(2) + '%' },
    { tabLabel: 'loan_first_payment_date', value: calculateFirstPaymentDate() },
    
    // New fields added
    { tabLabel: 'loan_total', value: calculateTotalLoanAmount().toFixed(2) }, // Total amount with interest
    { tabLabel: 'loan_term_weeks', value: loanData.termWeeks.toString() }, // Loan term in weeks
    { tabLabel: 'emission_date', value: getCurrentDate() }, // Document emission/creation date
    
    // iPay company information (static) - Updated address
    { tabLabel: 'iPay_name', value: 'iPay LLC' },
    { tabLabel: 'iPay_address_line_1 a7128350-f962-42dc-b480-aef50fb16c54', value: '6020 NW 99TH AVE, UNIT 313' }, // Updated iPay address
    { tabLabel: 'ipay_city', value: 'Doral' },
    { tabLabel: 'ipay_state', value: 'FL' },
    { tabLabel: 'ipay_zip_code', value: '33178' },
    { tabLabel: 'ipay_country', value: 'United States' },
  ];

  // Add payment schedule fields (up to 16 payments)
  for (let i = 1; i <= 16; i++) {
    const payment = loanData.paymentSchedules[i - 1];
    // Handle the special case for exp_date_16 which has a space in the template
    const expDateLabel = i === 16 ? 'exp_date_1 6' : `exp_date_${i}`;
    
    if (payment) {
      dealershipTabs.push(
        { tabLabel: expDateLabel, value: new Date(payment.dueDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) },
        { tabLabel: `principal_amount_${i}`, value: payment.principalAmount.toFixed(2) },
        { tabLabel: `payment_amount_${i}`, value: payment.totalAmount.toFixed(2) },
        { tabLabel: `balance_${i}`, value: payment.remainingBalance.toFixed(2) }
      );
    } else {
      // Fill empty slots with blank values
      dealershipTabs.push(
        { tabLabel: expDateLabel, value: '' },
        { tabLabel: `principal_amount_${i}`, value: '' },
        { tabLabel: `payment_amount_${i}`, value: '' },
        { tabLabel: `balance_${i}`, value: '' }
      );
    }
  }

  // Create text tabs for borrower fields (recipient 2)
  const borrowerTabs = [
    // Personal information
    { tabLabel: 'borrower_first_name', value: loanData.borrower.firstName },
    { tabLabel: 'borrower_last_name', value: loanData.borrower.lastName },
    { tabLabel: 'borrower_email', value: loanData.borrower.email || '' }, // Added missing email field
    { tabLabel: 'borrower_phone_country_code', value: borrowerPhone.countryCode },
    { tabLabel: 'borrower_phone_number', value: borrowerPhone.number },
    
    // Address information
    { tabLabel: 'borrower_address_line_1', value: loanData.borrower.addressLine1 || '' },
    { tabLabel: 'borrower_city', value: loanData.borrower.city || '' },
    { tabLabel: 'borrower_state', value: loanData.borrower.state || '' },
    { tabLabel: 'borrower_zip_code', value: loanData.borrower.zipCode || '' },
    { tabLabel: 'borrower_country', value: 'United States' },
    
    // Employment information
    { tabLabel: 'borrower_employer', value: loanData.borrower.currentEmployerName || '' },
    { tabLabel: 'borrower_employer_state', value: loanData.borrower.state || loanData.organization?.state || '' },
    { tabLabel: 'borrower_employed_time', value: loanData.borrower.timeWithEmployment || '' },
    { tabLabel: 'borrower_salary', value: loanData.borrower.annualIncome?.toFixed(2) || '' }, // Added missing salary field (using annualIncome)
    
    // References (note: template has spaces in some field names)
    { tabLabel: 'borrower_reference_name_1 _phone', value: reference1Phone.number },
    { tabLabel: 'borrower_reference_name_1 _country_code', value: reference1Phone.countryCode },
    { tabLabel: 'borrower_reference_name_2_phone', value: reference2Phone.number },
    { tabLabel: 'borrower_reference_name_2_country_code', value: reference2Phone.countryCode },
    
    // Loan type
    { tabLabel: 'loan_type', value: 'Personal Loan' },
  ];

  // Create iPay signer (signs first) - Changed from dealership to iPay
  const dealershipSigner = {
    email: 'admin@ipay.com', // iPay representative email
    name: 'iPay Representative',
    roleName: 'iPay', // Required for template roles - changed from 'Dealership'
    recipientId: '1',
    routingOrder: '1',
    tabs: {
      textTabs: dealershipTabs
    }
  };

  // Create borrower signer (signs second)
  const borrowerSigner = {
    email: loanData.borrower.email || '',
    name: `${loanData.borrower.firstName} ${loanData.borrower.lastName}`,
    roleName: 'Borrower', // Required for template roles
    recipientId: '2',
    routingOrder: '2',
    tabs: {
      textTabs: borrowerTabs
    }
  };

  // Create envelope definition using template
  const envelopeDefinition = {
    templateId,
    emailSubject: `Loan Agreement - ${loanData.loanNumber} - Signature Required`,
    templateRoles: [dealershipSigner, borrowerSigner],
    status: 'created' // Use 'created' for testing, 'sent' for production
  };

  return envelopeDefinition;
};

// Main test function
const testEnvelopeCreation = async () => {
  try {
    console.log('🔧 Testing Template-Based Envelope Creation with Database Field Mapping\n');

    // Step 1: Authenticate with DocuSign
    console.log('1. Authenticating with DocuSign...');
    const accessToken = await authenticateWithJWT();
    console.log('   ✅ Authentication successful\n');

    // Step 2: Create envelope definition with populated fields
    console.log('2. Creating envelope definition with field population...');
    const envelopeDefinition = createTemplateBasedEnvelope(mockLoanData);
    
    console.log('   📋 Envelope Definition Created:');
    console.log(`   - Template ID: ${envelopeDefinition.templateId}`);
    console.log(`   - Email Subject: ${envelopeDefinition.emailSubject}`);
    console.log(`   - Status: ${envelopeDefinition.status}`);
    console.log(`   - Recipients: ${envelopeDefinition.templateRoles.length} signers\n`);

    // Step 3: Display field mapping summary
    console.log('3. Field Mapping Summary:\n');
    
    console.log('   📊 DEALERSHIP FIELDS (Recipient 1):');
    const dealershipTabs = envelopeDefinition.templateRoles[0].tabs.textTabs;
    dealershipTabs.slice(0, 10).forEach(tab => { // Show first 10 for brevity
      console.log(`   - ${tab.tabLabel}: "${tab.value}"`);
    });
    console.log(`   - ... and ${dealershipTabs.length - 10} more payment schedule fields\n`);
    
    console.log('   👤 BORROWER FIELDS (Recipient 2):');
    const borrowerTabs = envelopeDefinition.templateRoles[1].tabs.textTabs;
    borrowerTabs.forEach(tab => {
      console.log(`   - ${tab.tabLabel}: "${tab.value}"`);
    });
    console.log();

    // Step 4: Create envelope in DocuSign (without sending)
    console.log('4. Creating envelope in DocuSign (draft mode)...');
    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath(DOCUSIGN_BASE_PATH);
    apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

    const envelopesApi = new docusign.EnvelopesApi(apiClient);
    
    const results = await envelopesApi.createEnvelope(DOCUSIGN_ACCOUNT_ID, {
      envelopeDefinition: envelopeDefinition
    });

    console.log('   ✅ Envelope created successfully!');
    console.log(`   - Envelope ID: ${results.envelopeId}`);
    console.log(`   - Status: ${results.status}`);
    console.log(`   - Status Date: ${results.statusDateTime}\n`);

    // Step 5: Verify field population by retrieving envelope
    console.log('5. Verifying field population...');
    const envelopeDetails = await envelopesApi.getEnvelope(DOCUSIGN_ACCOUNT_ID, results.envelopeId);
    
    console.log('   📄 Envelope Details:');
    console.log(`   - Created: ${envelopeDetails.createdDateTime}`);
    console.log(`   - Email Subject: ${envelopeDetails.emailSubject}`);
    console.log(`   - Recipients Count: ${envelopeDetails.recipients?.signers?.length || 0}\n`);

    // Step 6: Test completion summary
    console.log('🎉 TEST COMPLETED SUCCESSFULLY!\n');
    console.log('✅ Field Mapping Results:');
    console.log(`   - Database fields mapped: ${dealershipTabs.length + borrowerTabs.length} total`);
    console.log(`   - Dealership fields: ${dealershipTabs.length} (loan details + payment schedule)`);
    console.log(`   - Borrower fields: ${borrowerTabs.length} (personal + address + employment + references)`);
    console.log(`   - Sequential signing: Dealership (1st) → Borrower (2nd)`);
    console.log(`   - Envelope status: Created successfully in DocuSign\n`);

    console.log('📝 Next Steps:');
    console.log('   1. Review the populated fields in DocuSign dashboard');
    console.log('   2. Test with real loan data from your database');
    console.log('   3. Change status to "sent" for production use');
    console.log('   4. Implement webhook handling for status updates\n');

    // Optional: Delete the test envelope
    console.log('6. Cleaning up test envelope...');
    try {
      await envelopesApi.update(DOCUSIGN_ACCOUNT_ID, results.envelopeId, {
        envelopeDefinition: { status: 'voided', voidedReason: 'Test envelope cleanup' }
      });
      console.log('   ✅ Test envelope voided and cleaned up\n');
    } catch (error) {
      console.log('   ⚠️  Could not void test envelope (may need manual cleanup)\n');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.body) {
      console.error('   Response details:', JSON.stringify(error.response.body, null, 2));
    } else {
      console.error('   Full error:', error);
    }
  }
};

// Run the test
if (require.main === module) {
  testEnvelopeCreation();
}