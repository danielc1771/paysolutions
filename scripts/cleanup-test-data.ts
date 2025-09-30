/**
 * Clean Up Test Loan Data
 * 
 * This script removes all test data created for DocuSign testing.
 * Run with: npx tsx scripts/cleanup-test-data.ts
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

async function cleanupTestData() {
  console.log('🧹 Cleaning up test loan data...\n');

  try {
    // Step 1: Find and delete test borrower first
    console.log('🔍 Finding test borrower...');
    
    const { data: testBorrower, error: findBorrowerError } = await supabase
      .from('borrowers')
      .select('id, email, first_name, last_name')
      .eq('email', 'ssalas.wt@gmail.com')
      .maybeSingle();

    if (findBorrowerError) {
      throw new Error(`Failed to find test borrower: ${findBorrowerError.message}`);
    }

    let deletedLoansCount = 0;
    let deletedBorrowerCount = 0;

    if (testBorrower) {
      console.log(`📋 Found test borrower: ${testBorrower.first_name} ${testBorrower.last_name} (${testBorrower.email})\n`);
      
      // Step 2: Find all loans for this borrower
      console.log('🔍 Finding loans for test borrower...');
      
      const { data: testLoans, error: findLoansError } = await supabase
        .from('loans')
        .select('id, loan_number')
        .eq('borrower_id', testBorrower.id);

      if (findLoansError) {
        throw new Error(`Failed to find loans: ${findLoansError.message}`);
      }

      if (testLoans && testLoans.length > 0) {
        console.log(`📋 Found ${testLoans.length} loan(s) for test borrower:\n`);
        testLoans.forEach((loan, index) => {
          console.log(`   ${index + 1}. ${loan.loan_number} (ID: ${loan.id})`);
        });
        console.log('');

        // Step 3: Delete loans (will cascade delete related records)
        console.log('🗑️  Deleting test loans...');
        
        const { error: deleteLoansError } = await supabase
          .from('loans')
          .delete()
          .eq('borrower_id', testBorrower.id);

        if (deleteLoansError) {
          throw new Error(`Failed to delete test loans: ${deleteLoansError.message}`);
        }

        deletedLoansCount = testLoans.length;
        console.log(`✅ Deleted ${testLoans.length} test loan(s)\n`);
      } else {
        console.log('✅ No loans found for test borrower\n');
      }

      // Step 4: Delete test borrower
      console.log('🗑️  Deleting test borrower...');
      
      const { error: deleteBorrowerError } = await supabase
        .from('borrowers')
        .delete()
        .eq('email', 'ssalas.wt@gmail.com');

      if (deleteBorrowerError) {
        throw new Error(`Failed to delete test borrower: ${deleteBorrowerError.message}`);
      }

      deletedBorrowerCount = 1;
      console.log('✅ Deleted test borrower\n');
    } else {
      console.log('✅ No test borrower found\n');
    }

    // Step 5: Also check for any orphaned test loans
    console.log('🔍 Checking for orphaned test loans...');
    
    const { data: orphanedLoans, error: findOrphanedError } = await supabase
      .from('loans')
      .select('id, loan_number')
      .like('loan_number', 'LOAN-TEST-%');

    if (findOrphanedError) {
      throw new Error(`Failed to find orphaned loans: ${findOrphanedError.message}`);
    }

    if (orphanedLoans && orphanedLoans.length > 0) {
      console.log(`📋 Found ${orphanedLoans.length} orphaned test loan(s):\n`);
      orphanedLoans.forEach((loan, index) => {
        console.log(`   ${index + 1}. ${loan.loan_number} (ID: ${loan.id})`);
      });
      console.log('');

      console.log('🗑️  Deleting orphaned test loans...');
      
      const { error: deleteOrphanedError } = await supabase
        .from('loans')
        .delete()
        .like('loan_number', 'LOAN-TEST-%');

      if (deleteOrphanedError) {
        throw new Error(`Failed to delete orphaned loans: ${deleteOrphanedError.message}`);
      }

      deletedLoansCount += orphanedLoans.length;
      console.log(`✅ Deleted ${orphanedLoans.length} orphaned test loan(s)\n`);
    } else {
      console.log('✅ No orphaned test loans found\n');
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 CLEANUP COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`✅ Removed ${deletedLoansCount} test loan(s)`);
    console.log(`✅ Removed ${deletedBorrowerCount} test borrower(s)\n`);
    console.log('💡 Run "npm run test:create-loan" to create new test data\n');

  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    throw error;
  }
}

// Run the script
cleanupTestData()
  .then(() => {
    console.log('✅ Cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
