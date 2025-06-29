import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Import cleaned data directly to new database
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📥 Starting cleaned data import...');
    
    const supabase = await createClient();
    
    // Cleaned borrowers data
    const borrowers = [
      {
        "id": "8dba0b65-ec10-4c69-81ed-0382f0a14eb7",
        "email": "architex.development@gmail.com",
        "first_name": "Sebas",
        "last_name": "Salas",
        "phone": "12345678",
        "address_line1": "adslfgjkahsdflkajh",
        "city": "asdlfasdhjlkf",
        "state": "fl",
        "zip_code": "20740",
        "date_of_birth": "1994-01-22",
        "ssn": "4578",
        "kyc_status": "pending",
        "created_at": "2025-06-24T17:29:41.905374+00:00",
        "updated_at": "2025-06-24T17:31:17.585635+00:00",
        "employment_status": "employed",
        "annual_income": 120000
      },
      {
        "id": "05d2c948-a7b7-4a86-beb1-6e2e175d48dc",
        "email": "ssalas.wt@gmail.com",
        "first_name": "Sebastian",
        "last_name": "SALAS",
        "phone": "7863029144",
        "address_line1": "4400 Calvert Rd",
        "city": "College Park",
        "state": "MD",
        "zip_code": "20740",
        "date_of_birth": "2025-06-06",
        "ssn": "5678",
        "kyc_status": "pending",
        "created_at": "2025-06-28T17:20:51.48148+00:00",
        "updated_at": "2025-06-28T17:20:51.48148+00:00",
        "employment_status": "employed",
        "annual_income": 500
      },
      {
        "id": "d337a425-5a68-4d0a-b9b4-576e18afecc8",
        "email": "jgarcia@easycarus.com",
        "first_name": "Jhoam",
        "last_name": "Garcia",
        "phone": "7861234567",
        "address_line1": "4400 Calvert Rd",
        "city": "College Park",
        "state": "MD",
        "zip_code": "20740",
        "date_of_birth": "2025-06-11",
        "ssn": "6789",
        "kyc_status": "pending",
        "created_at": "2025-06-28T19:04:39.959872+00:00",
        "updated_at": "2025-06-28T19:04:39.959872+00:00",
        "employment_status": "employed",
        "annual_income": 99999.95
      }
    ];
    
    // Cleaned loans data
    const loans = [
      {
        "id": "eca99f51-906f-4dd2-9992-0e9f6d9c520e",
        "borrower_id": "d337a425-5a68-4d0a-b9b4-576e18afecc8",
        "loan_number": "PSL1751137480291",
        "principal_amount": 10000,
        "interest_rate": 0.3,
        "term_months": 10,
        "monthly_payment": 1142.59,
        "status": "signed",
        "remaining_balance": 10000,
        "purpose": "auto",
        "docusign_envelope_id": "881caf8d-1496-499e-ab61-5508d85ff170",
        "docusign_status": "signed",
        "docusign_status_updated": "2025-06-29T01:02:23.265+00:00",
        "docusign_completed_at": "2025-06-28T19:06:54.46+00:00",
        "created_at": "2025-06-28T19:04:40.329625+00:00",
        "updated_at": "2025-06-29T01:02:23.330083+00:00"
      }
    ];
    
    const results = {
      borrowers: { success: false, count: 0, error: null },
      loans: { success: false, count: 0, error: null }
    };
    
    // Import borrowers
    console.log(`📋 Importing ${borrowers.length} borrowers...`);
    const { error: borrowersError } = await supabase
      .from('borrowers')
      .insert(borrowers);
    
    if (borrowersError) {
      console.error('❌ Borrowers import failed:', borrowersError);
      results.borrowers.error = borrowersError.message;
    } else {
      console.log(`✅ Imported ${borrowers.length} borrowers`);
      results.borrowers.success = true;
      results.borrowers.count = borrowers.length;
    }
    
    // Import loans
    console.log(`📋 Importing ${loans.length} loans...`);
    const { error: loansError } = await supabase
      .from('loans')
      .insert(loans);
    
    if (loansError) {
      console.error('❌ Loans import failed:', loansError);
      results.loans.error = loansError.message;
    } else {
      console.log(`✅ Imported ${loans.length} loans`);
      results.loans.success = true;
      results.loans.count = loans.length;
    }
    
    const overallSuccess = results.borrowers.success && results.loans.success;
    
    console.log('\n📊 Import Summary:');
    console.log(`- Borrowers: ${results.borrowers.success ? '✅' : '❌'} ${results.borrowers.count}`);
    console.log(`- Loans: ${results.loans.success ? '✅' : '❌'} ${results.loans.count}`);
    
    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess ? 'Data imported successfully!' : 'Some data imports failed',
      results,
      next_step: overallSuccess ? 'Ready to test application' : 'Please check errors'
    });
    
  } catch (error) {
    console.error('❌ Data import failed:', error);
    return NextResponse.json(
      { error: 'Failed to import data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}