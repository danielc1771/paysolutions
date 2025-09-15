#!/usr/bin/env node

// Create a sample envelope that won't be auto-deleted so you can review it
require('dotenv').config({ path: '.env.local' });

const docusign = require('docusign-esign');

// DocuSign configuration
const DOCUSIGN_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY;
const DOCUSIGN_USER_ID = process.env.DOCUSIGN_USER_ID;
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID;
const DOCUSIGN_BASE_PATH = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';
const DOCUSIGN_PRIVATE_KEY = process.env.DOCUSIGN_PRIVATE_KEY;

const TEMPLATE_ID = '8b9711f2-c304-4467-aa5c-27ebca4b4cc4';

// Sample loan data
const sampleLoanData = {
  id: 'sample-loan-uuid',
  loanNumber: 'DEMO-2025-001',
  principalAmount: 25000.00,
  interestRate: 0.0999, // 9.99%
  termWeeks: 52,
  weeklyPayment: 542.85,
  purpose: 'Vehicle Purchase Down Payment',
  vehicleYear: '2022',
  vehicleMake: 'Honda',
  vehicleModel: 'Accord',
  vehicleVin: '1HGCV1F3XNA123456',
  customerFirstName: 'Maria',
  customerLastName: 'Garcia',
  organizationId: 'sample-org-uuid',

  borrower: {
    id: 'sample-borrower-uuid',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@email.com',
    phone: '(786) 555-0199',
    dateOfBirth: '1990-03-22',
    addressLine1: '2875 Coral Way',
    city: 'Miami',
    state: 'FL',
    zipCode: '33145',
    employmentStatus: 'Full-time',
    annualIncome: 78000,
    currentEmployerName: 'Miami Medical Center',
    timeWithEmployment: '4 years',
    reference1Name: 'Carlos Rodriguez',
    reference1Phone: '(786) 555-0201',
    reference1Email: 'carlos.rodriguez@email.com',
    reference2Name: 'Sofia Martinez',
    reference2Phone: '(786) 555-0202',
    reference2Email: 'sofia.martinez@email.com',
    reference3Name: null,
    reference3Phone: null,
    reference3Email: null,
    organizationId: 'sample-org-uuid',
  },

  organization: {
    id: 'sample-org-uuid',
    name: 'Sunshine Auto Sales',
    email: 'admin@sunshineautos.com',
    phone: '(786) 555-0100',
    address: '8950 NW 36th Street',
    city: 'Doral',
    state: 'FL',
    zipCode: '33178',
  },

  // Sample payment schedule (first 8 payments)
  paymentSchedules: [
    {
      id: 'payment-1-uuid',
      paymentNumber: 1,
      dueDate: '2025-09-22',
      principalAmount: 481.30,
      interestAmount: 61.55,
      totalAmount: 542.85,
      remainingBalance: 24518.70,
    },
    {
      id: 'payment-2-uuid',
      paymentNumber: 2,
      dueDate: '2025-09-29',
      principalAmount: 482.23,
      interestAmount: 60.62,
      totalAmount: 542.85,
      remainingBalance: 24036.47,
    },
    {
      id: 'payment-3-uuid',
      paymentNumber: 3,
      dueDate: '2025-10-06',
      principalAmount: 483.15,
      interestAmount: 59.70,
      totalAmount: 542.85,
      remainingBalance: 23553.32,
    },
    {
      id: 'payment-4-uuid',
      paymentNumber: 4,
      dueDate: '2025-10-13',
      principalAmount: 484.08,
      interestAmount: 58.77,
      totalAmount: 542.85,
      remainingBalance: 23069.24,
    },
    {
      id: 'payment-5-uuid',
      paymentNumber: 5,
      dueDate: '2025-10-20',
      principalAmount: 485.01,
      interestAmount: 57.84,
      totalAmount: 542.85,
      remainingBalance: 22584.23,
    },
    {
      id: 'payment-6-uuid',
      paymentNumber: 6,
      dueDate: '2025-10-27',
      principalAmount: 485.94,
      interestAmount: 56.91,
      totalAmount: 542.85,
      remainingBalance: 22098.29,
    },
    {
      id: 'payment-7-uuid',
      paymentNumber: 7,
      dueDate: '2025-11-03',
      principalAmount: 486.88,
      interestAmount: 55.97,
      totalAmount: 542.85,
      remainingBalance: 21611.41,
    },
    {
      id: 'payment-8-uuid',
      paymentNumber: 8,
      dueDate: '2025-11-10',
      principalAmount: 487.81,
      interestAmount: 55.04,
      totalAmount: 542.85,
      remainingBalance: 21123.60,
    }
  ]
};

// JWT authentication
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

// Create envelope with sample data
const createSampleEnvelope = async () => {
  try {
    console.log('📋 Creating Sample DocuSign Envelope for Review\n');
    console.log('🏢 Sample Dealership: Sunshine Auto Sales');
    console.log('👤 Sample Borrower: Maria Garcia');
    console.log('🚗 Sample Vehicle: 2022 Honda Accord');
    console.log('💰 Sample Loan: $25,000 @ 9.99% for 52 weeks\n');

    // Authenticate
    console.log('🔐 Authenticating with DocuSign...');
    const accessToken = await authenticateWithJWT();
    console.log('✅ Authentication successful\n');

    // Helper functions
    const formatPhoneNumber = (phone) => {
      if (!phone) return { countryCode: '+1', number: '' };
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) {
        return { countryCode: '+1', number: digits };
      } else if (digits.length === 11 && digits.startsWith('1')) {
        return { countryCode: '+1', number: digits.substring(1) };
      }
      return { countryCode: '+1', number: digits };
    };

    const calculateFirstPaymentDate = () => {
      const firstPayment = new Date();
      firstPayment.setDate(firstPayment.getDate() + 7);
      return firstPayment.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    };

    // Parse phone numbers
    const borrowerPhone = formatPhoneNumber(sampleLoanData.borrower.phone);
    const reference1Phone = formatPhoneNumber(sampleLoanData.borrower.reference1Phone);
    const reference2Phone = formatPhoneNumber(sampleLoanData.borrower.reference2Phone);

    // Helper functions for new fields
    const calculateTotalLoanAmount = () => {
      return sampleLoanData.paymentSchedules.reduce((total, payment) => total + payment.totalAmount, 0);
    };

    const getCurrentDate = () => {
      return new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    };

    // Create iPay tabs (previously dealership tabs)
    const dealershipTabs = [
      // Basic loan information
      { tabLabel: 'dealership_name', value: sampleLoanData.organization?.name || 'iPay Solutions' },
      { tabLabel: 'vehicle_year', value: sampleLoanData.vehicleYear },
      { tabLabel: 'vehicle_make', value: sampleLoanData.vehicleMake },
      { tabLabel: 'vehicle_model', value: sampleLoanData.vehicleModel },
      { tabLabel: 'vehicle_vin', value: sampleLoanData.vehicleVin },
      { tabLabel: 'loan_amount', value: sampleLoanData.principalAmount.toFixed(2) },
      { tabLabel: 'interest_applied', value: (sampleLoanData.interestRate * 100).toFixed(2) + '%' },
      { tabLabel: 'loan_first_payment_date', value: calculateFirstPaymentDate() },
      
      // New fields added
      { tabLabel: 'loan_total', value: calculateTotalLoanAmount().toFixed(2) }, // Total amount with interest
      { tabLabel: 'loan_term_weeks', value: sampleLoanData.termWeeks.toString() }, // Loan term in weeks
      { tabLabel: 'emission_date', value: getCurrentDate() }, // Document emission/creation date
      
      // iPay company information - Updated address
      { tabLabel: 'iPay_name', value: 'iPay LLC' },
      { tabLabel: 'iPay_address_line_1 a7128350-f962-42dc-b480-aef50fb16c54', value: '6020 NW 99TH AVE, UNIT 313' }, // Updated iPay address
      { tabLabel: 'ipay_city', value: 'Doral' },
      { tabLabel: 'ipay_state', value: 'FL' },
      { tabLabel: 'ipay_zip_code', value: '33178' },
      { tabLabel: 'ipay_country', value: 'United States' },
    ];

    // Add payment schedule fields
    for (let i = 1; i <= 16; i++) {
      const payment = sampleLoanData.paymentSchedules[i - 1];
      const expDateLabel = i === 16 ? 'exp_date_1 6' : `exp_date_${i}`;
      
      if (payment) {
        dealershipTabs.push(
          { tabLabel: expDateLabel, value: new Date(payment.dueDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) },
          { tabLabel: `principal_amount_${i}`, value: payment.principalAmount.toFixed(2) },
          { tabLabel: `payment_amount_${i}`, value: payment.totalAmount.toFixed(2) },
          { tabLabel: `balance_${i}`, value: payment.remainingBalance.toFixed(2) }
        );
      } else {
        dealershipTabs.push(
          { tabLabel: expDateLabel, value: '' },
          { tabLabel: `principal_amount_${i}`, value: '' },
          { tabLabel: `payment_amount_${i}`, value: '' },
          { tabLabel: `balance_${i}`, value: '' }
        );
      }
    }

    // Create borrower tabs
    const borrowerTabs = [
      // Personal information
      { tabLabel: 'borrower_first_name', value: sampleLoanData.borrower.firstName },
      { tabLabel: 'borrower_last_name', value: sampleLoanData.borrower.lastName },
      { tabLabel: 'borrower_email', value: sampleLoanData.borrower.email || '' }, // Added missing email field
      { tabLabel: 'borrower_phone_country_code', value: borrowerPhone.countryCode },
      { tabLabel: 'borrower_phone_number', value: borrowerPhone.number },
      
      // Address information
      { tabLabel: 'borrower_address_line_1', value: sampleLoanData.borrower.addressLine1 || '' },
      { tabLabel: 'borrower_city', value: sampleLoanData.borrower.city || '' },
      { tabLabel: 'borrower_state', value: sampleLoanData.borrower.state || '' },
      { tabLabel: 'borrower_zip_code', value: sampleLoanData.borrower.zipCode || '' },
      { tabLabel: 'borrower_country', value: 'United States' },
      
      // Employment information
      { tabLabel: 'borrower_employer', value: sampleLoanData.borrower.currentEmployerName || '' },
      { tabLabel: 'borrower_employer_state', value: sampleLoanData.borrower.state || sampleLoanData.organization?.state || '' },
      { tabLabel: 'borrower_employed_time', value: sampleLoanData.borrower.timeWithEmployment || '' },
      { tabLabel: 'borrower_salary', value: sampleLoanData.borrower.annualIncome?.toFixed(2) || '' }, // Added missing salary field (using annualIncome)
      
      // References
      { tabLabel: 'borrower_reference_name_1 _phone', value: reference1Phone.number },
      { tabLabel: 'borrower_reference_name_1 _country_code', value: reference1Phone.countryCode },
      { tabLabel: 'borrower_reference_name_2_phone', value: reference2Phone.number },
      { tabLabel: 'borrower_reference_name_2_country_code', value: reference2Phone.countryCode },
      
      // Loan type
      { tabLabel: 'loan_type', value: 'Personal Loan' },
    ];

    // Create iPay signer (changed from dealership)
    const dealershipSigner = {
      email: 'admin@ipay.com', // iPay representative email
      name: 'iPay Representative',
      roleName: 'iPay', // Changed from 'Dealership'
      recipientId: '1',
      routingOrder: '1',
      tabs: {
        textTabs: dealershipTabs
      }
    };

    const borrowerSigner = {
      email: sampleLoanData.borrower.email || '',
      name: `${sampleLoanData.borrower.firstName} ${sampleLoanData.borrower.lastName}`,
      roleName: 'Borrower',
      recipientId: '2',
      routingOrder: '2',
      tabs: {
        textTabs: borrowerTabs
      }
    };

    // Create envelope definition
    const envelopeDefinition = {
      templateId: TEMPLATE_ID,
      emailSubject: `📄 SAMPLE - Loan Agreement - ${sampleLoanData.loanNumber} - Ready for Review`,
      templateRoles: [dealershipSigner, borrowerSigner],
      status: 'created' // Create as draft for review
    };

    console.log('📤 Creating sample envelope...');
    const apiClient = new docusign.ApiClient();
    apiClient.setBasePath(DOCUSIGN_BASE_PATH);
    apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

    const envelopesApi = new docusign.EnvelopesApi(apiClient);
    
    const results = await envelopesApi.createEnvelope(DOCUSIGN_ACCOUNT_ID, {
      envelopeDefinition: envelopeDefinition
    });

    console.log('✅ Sample envelope created successfully!\n');
    
    console.log('📋 ENVELOPE DETAILS:');
    console.log(`   - Envelope ID: ${results.envelopeId}`);
    console.log(`   - Status: ${results.status}`);
    console.log(`   - Created: ${results.statusDateTime}`);
    console.log('');
    
    console.log('🔍 HOW TO VIEW THE FILLED TEMPLATE:');
    console.log('   1. Go to: https://demo.docusign.net');
    console.log('   2. Login to your DocuSign account');
    console.log('   3. Navigate to: Manage → Drafts');
    console.log(`   4. Look for: "📄 SAMPLE - Loan Agreement - ${sampleLoanData.loanNumber} - Ready for Review"`);
    console.log('   5. Click to open and review all populated fields');
    console.log('');
    
    console.log('📊 SAMPLE DATA POPULATED:');
    console.log(`   - Dealership: ${sampleLoanData.organization.name}`);
    console.log(`   - Vehicle: ${sampleLoanData.vehicleYear} ${sampleLoanData.vehicleMake} ${sampleLoanData.vehicleModel}`);
    console.log(`   - Loan Amount: $${sampleLoanData.principalAmount.toLocaleString()}`);
    console.log(`   - Interest Rate: ${(sampleLoanData.interestRate * 100).toFixed(2)}%`);
    console.log(`   - Borrower: ${sampleLoanData.borrower.firstName} ${sampleLoanData.borrower.lastName}`);
    console.log(`   - Payment Schedule: ${sampleLoanData.paymentSchedules.length} payments populated`);
    console.log(`   - Total Fields Filled: ${dealershipTabs.length + borrowerTabs.length} fields`);
    console.log('');
    
    console.log('🎯 THIS ENVELOPE WILL NOT BE AUTO-DELETED');
    console.log('   You can review it at your leisure in the DocuSign dashboard');
    console.log('   Delete it manually when you\'re done reviewing');

  } catch (error) {
    console.error('❌ Error creating sample envelope:', error.message);
    if (error.response?.data) {
      console.error('   Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
};

// Run the sample creation
if (require.main === module) {
  createSampleEnvelope();
}