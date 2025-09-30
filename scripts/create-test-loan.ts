/**
 * Create Test Loan Data for DocuSign Testing
 * 
 * This script creates a complete test borrower and loan using the Supabase API.
 * Run with: npx tsx scripts/create-test-loan.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestLoan() {
  console.log('🚀 Creating test loan data for DocuSign testing...\n');

  try {
    // Step 1: Create test borrower
    console.log('📝 Creating test borrower...');
    
    const borrowerData = {
      email: 'ssalas.wt@gmail.com',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+15551234567',
      date_of_birth: '1990-05-15',
      address: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zip_code: '10001',
      country: 'US',
      employment_status: 'employed',
      annual_income: 75000,
      current_employer_name: 'Acme Corporation',
      employer_state: 'NY',
      time_with_employment: '3 years',
      reference1_name: 'Jane Smith',
      reference1_phone: '5559876543',
      reference1_email: 'jane.smith@example.com',
      reference1_country_code: '+1',
      reference2_name: 'Bob Johnson',
      reference2_phone: '5551112222',
      reference2_email: 'bob.johnson@example.com',
      reference2_country_code: '+1',
      reference3_name: 'Alice Brown',
      reference3_phone: '5553334444',
      reference3_email: 'alice.brown@example.com',
    };

    const { data: borrower, error: borrowerError } = await supabase
      .from('borrowers')
      .insert(borrowerData)
      .select()
      .single();

    if (borrowerError) {
      throw new Error(`Failed to create borrower: ${borrowerError.message}`);
    }

    console.log('✅ Borrower created successfully');
    console.log(`   ID: ${borrower.id}`);
    console.log(`   Name: ${borrower.first_name} ${borrower.last_name}`);
    console.log(`   Email: ${borrower.email}\n`);

    // Step 2: Create test loan
    console.log('📝 Creating test loan...');

    const loanNumber = `LOAN-TEST-${Date.now()}`;
    
    const loanData = {
      borrower_id: borrower.id,
      loan_number: loanNumber,
      principal_amount: 25000.00,
      interest_rate: 5.5,
      term_weeks: 156, // 36 months
      weekly_payment: 185.50,
      amount: 25000.00,
      loan_type: 'Auto Loan',
      term_months: 36,
      monthly_payment: 750.00,
      status: 'application_completed',
      vehicle_year: '2020',
      vehicle_make: 'Toyota',
      vehicle_model: 'Camry',
      vehicle_vin: '1HGBH41JXMN109186',
      customer_first_name: 'John',
      customer_last_name: 'Doe',
      application_step: 9,
      phone_verification_status: 'verified',
      verified_phone_number: '+15551234567',
      stripe_verification_status: 'verified',
    };

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .insert(loanData)
      .select()
      .single();

    if (loanError) {
      throw new Error(`Failed to create loan: ${loanError.message}`);
    }

    console.log('✅ Loan created successfully');
    console.log(`   ID: ${loan.id}`);
    console.log(`   Loan Number: ${loan.loan_number}`);
    console.log(`   Amount: $${loan.amount}`);
    console.log(`   Type: ${loan.loan_type}`);
    console.log(`   Vehicle: ${loan.vehicle_year} ${loan.vehicle_make} ${loan.vehicle_model}\n`);

    // Step 3: Display test instructions
    console.log('🎉 Test data created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 TEST INFORMATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🔑 IDs for Testing:');
    console.log(`   Borrower ID: ${borrower.id}`);
    console.log(`   Loan ID: ${loan.id}`);
    console.log(`   Loan Number: ${loan.loan_number}\n`);

    console.log('📧 Email Addresses:');
    console.log('   1. iPay: jhoamadrian@gmail.com (signs first)');
    console.log('   2. Borrower: testborrower@example.com (signs second)');
    console.log('   3. Organization: jgarcia@easycarus.com (signs third)\n');

    console.log('🧪 Test with cURL:');
    console.log(`   curl -X POST http://localhost:3000/api/docusign/create-envelope \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -d '{"loanId": "${loan.id}"}'\n`);

    console.log('🧪 Test with Browser Console:');
    console.log(`   fetch('/api/docusign/create-envelope', {`);
    console.log(`     method: 'POST',`);
    console.log(`     headers: { 'Content-Type': 'application/json' },`);
    console.log(`     body: JSON.stringify({ loanId: '${loan.id}' })`);
    console.log(`   }).then(r => r.json()).then(console.log)\n`);

    console.log('🧪 Test Page URL:');
    console.log(`   http://localhost:3000/test-docusign`);
    console.log(`   (Paste Loan ID: ${loan.id})\n`);

    console.log('🗑️  Clean up after testing:');
    console.log(`   DELETE FROM loans WHERE id = '${loan.id}';`);
    console.log(`   DELETE FROM borrowers WHERE id = '${borrower.id}';\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return { borrower, loan };

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
}

// Run the script
createTestLoan()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
