const fs = require('fs');

// Read exported data
const rawData = fs.readFileSync('exported-data.json', 'utf8');
const exportData = JSON.parse(rawData);

console.log('🔧 Cleaning data for import...');

// Clean borrowers data - remove columns that don't exist in new schema
const cleanedBorrowers = exportData.data.borrowers.map(borrower => {
  const cleaned = {
    id: borrower.id,
    first_name: borrower.first_name,
    last_name: borrower.last_name,
    email: borrower.email,
    phone: borrower.phone,
    date_of_birth: borrower.date_of_birth,
    address_line1: borrower.address_line1,
    city: borrower.city,
    state: borrower.state,
    zip_code: borrower.zip_code,
    employment_status: borrower.employment_status,
    annual_income: borrower.annual_income,
    kyc_status: borrower.kyc_status,
    ssn: borrower.ssn_last_four, // Map ssn_last_four to ssn
    created_at: borrower.created_at,
    updated_at: borrower.updated_at
  };
  
  // Remove null/undefined values
  return Object.fromEntries(Object.entries(cleaned).filter(([_, v]) => v !== null && v !== undefined));
});

// Clean loans data - remove columns that don't exist in new schema  
const cleanedLoans = exportData.data.loans.map(loan => {
  const cleaned = {
    id: loan.id,
    loan_number: loan.loan_number,
    borrower_id: loan.borrower_id,
    principal_amount: loan.principal_amount,
    interest_rate: loan.interest_rate,
    term_months: loan.term_months,
    monthly_payment: loan.monthly_payment,
    purpose: loan.purpose,
    status: loan.status,
    funding_date: loan.funding_date,
    remaining_balance: loan.remaining_balance,
    docusign_envelope_id: loan.docusign_envelope_id,
    docusign_status: loan.docusign_status,
    docusign_status_updated: loan.docusign_status_updated,
    docusign_completed_at: loan.docusign_completed_at,
    created_at: loan.created_at,
    updated_at: loan.updated_at
  };
  
  // Remove null/undefined values
  return Object.fromEntries(Object.entries(cleaned).filter(([_, v]) => v !== null && v !== undefined));
});

const cleanedData = {
  borrowers: cleanedBorrowers,
  loans: cleanedLoans,
  payment_schedules: exportData.data.payment_schedules || [],
  payments: exportData.data.payments || []
};

// Save cleaned data
fs.writeFileSync('cleaned-data.json', JSON.stringify(cleanedData, null, 2));

console.log('✅ Data cleaned and saved to cleaned-data.json');
console.log(`📊 Cleaned data summary:`);
console.log(`- Borrowers: ${cleanedBorrowers.length}`);
console.log(`- Loans: ${cleanedLoans.length}`);

// Show first borrower for verification
console.log('\n📋 Sample cleaned borrower:');
console.log(JSON.stringify(cleanedBorrowers[0], null, 2));

console.log('\n📋 Sample cleaned loan:');
console.log(JSON.stringify(cleanedLoans[0], null, 2));