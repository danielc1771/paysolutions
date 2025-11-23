/**
 * DocuSign Field Mapper
 * 
 * Maps loan application data from Supabase to DocuSign template field labels
 * Adjust the field names to match your specific DocuSign template
 */

export interface PaymentScheduleItem {
  payment_number: number;
  due_date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  remaining_balance: number;
}

export interface LoanApplicationData {
  // Loan information
  id: string;
  amount?: number;
  loan_type?: string;
  term_months?: number;
  term_weeks?: number;
  interest_rate?: number;
  monthly_payment?: number;
  weekly_payment?: number;
  principal_amount?: number;
  verified_phone_number?: string;
  created_at?: string;
  organization_id?: string;
  
  // Vehicle information
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_vin?: string;
  
  // Payment schedule (from payment_schedules table)
  payment_schedule?: PaymentScheduleItem[];
  
  // Organization information (from joined query)
  organization?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  
  // Borrower information (from joined query)
  borrower: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    address?: string;
    address_line1?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    country?: string;
    
    // Employment
    employment_status?: string;
    annual_income?: number;
    current_employer_name?: string;
    employer_state?: string;
    time_with_employment?: string;
    
    // References
    reference1_name?: string;
    reference1_phone?: string;
    reference1_email?: string;
    reference1_country_code?: string;
    reference2_name?: string;
    reference2_phone?: string;
    reference2_email?: string;
    reference2_country_code?: string;
    reference3_name?: string;
    reference3_phone?: string;
    reference3_email?: string;
    
    // Additional fields
    [key: string]: unknown;
  };
}

/**
 * Maps loan data to DocuSign template fields for ALL roles (iPay, Borrower, Organization)
 * Returns an object with field labels as keys and values as strings
 */
export function mapLoanDataToDocuSignFields(loan: LoanApplicationData): Record<string, string> {
  const borrower = loan.borrower;
  const loanAmount = Number(loan.amount || loan.principal_amount || 0);
  const interestRate = Number(loan.interest_rate || 0);
  const termWeeks = Number(loan.term_weeks || 16);
  
  // Calculate total with interest
  // If payment schedule exists, use the sum of all payments for accuracy
  let totalWithInterest: number;
  let totalInterest: number;
  
  if (loan.payment_schedule && loan.payment_schedule.length > 0) {
    // Calculate from actual payment schedule
    totalInterest = loan.payment_schedule.reduce((sum, payment) => sum + (payment.interest_amount || 0), 0);
    totalWithInterest = loan.payment_schedule.reduce((sum, payment) => sum + (payment.total_amount || 0), 0);
  } else {
    // Fallback: Simple calculation (will be 0 if interest rate is 0)
    totalInterest = loanAmount * (interestRate / 100);
    totalWithInterest = loanAmount + totalInterest;
  }
  
  // Debug: Log loan calculations
  console.log('💵 Loan Calculations:', {
    loanAmount,
    termWeeks,
    termWeeksType: typeof loan.term_weeks,
    termWeeksRaw: loan.term_weeks,
    interestRate,
    totalInterest: totalInterest.toFixed(2),
    totalWithInterest: totalWithInterest.toFixed(2),
    hasPaymentSchedule: !!loan.payment_schedule?.length
  });
  
  // Calculate first payment date (1 week from creation)
  const createdDate = loan.created_at ? new Date(loan.created_at) : new Date();
  const firstPaymentDate = new Date(createdDate);
  firstPaymentDate.setDate(firstPaymentDate.getDate() + 7);
  
  // Create the mapping based on your DocuSign template field labels
  const fieldMapping: Record<string, string> = {
    // ===== iPay Fields =====
    // Loan basic info
    'loan_amount': String(loanAmount),
    'interest_applied': String(totalInterest.toFixed(2)),
    'loan_total_with_interest': String(totalWithInterest.toFixed(2)),
    'loan_term_weeks': String(termWeeks),
    'loan_first_payment_date': firstPaymentDate.toISOString().split('T')[0],
    'emission_date': createdDate.toISOString().split('T')[0],
    // Vehicle Information
    'vehicle_year': loan.vehicle_year || '',
    'vehicle_make': loan.vehicle_make || '',
    'vehicle_model': loan.vehicle_model || '',
    'vehicle_vin': loan.vehicle_vin || '',
    
    // iPay Company Info (hardcoded - iPay's official information)
    'iPay_name': 'iPay Solutions',
    'iPay_address_line': '6020 NW 99TH AVE UNIT 313',
    'ipay_city': 'DORAL',
    'ipay_state': 'FL',
    'ipay_zip_code': '33178',
    'ipay_country': 'US',
    'ipay_email': 'ipaycustomer@gmail.com',
    
    // Organization Info (from loan organization data)
    'dealership_name': loan.organization?.name || '',
    'org_name': loan.organization?.name || '',
    'org_address_line': loan.organization?.address || '',
    'org_city': loan.organization?.city || '',
    'org_state': loan.organization?.state || '',
    'org_zip_code': loan.organization?.zip_code || '',
    'org_country': 'US',
    'org_email': loan.organization?.email || '',
    'org_phone': loan.organization?.phone || '',
    
    // ===== Borrower Fields =====
    // Borrower Personal Information
    'borrower_first_name': borrower.first_name || '',
    'borrower_last_name': borrower.last_name || '',
    'borrower_email': borrower.email || '',
    'borrower_phone_number': loan.verified_phone_number || borrower.phone || '',
    'borrower_phone_country_code': '+1',
    'date_of_birth': borrower.date_of_birth || '',
    
    // Address Information
    'borrower_address_line_1': borrower.address_line1 || borrower.address || '',
    'borrower_city': borrower.city || '',
    'borrower_state': borrower.state || '',
    'borrower_zip_code': borrower.zip_code || '',
    'borrower_country': borrower.country || 'US',
    
    // Employment Information
    'employment_status': borrower.employment_status || '',
    'borrower_employer': borrower.current_employer_name || '',
    'borrower_employer_state': borrower.employer_state || '',
    'borrower_employed_time': borrower.time_with_employment || '',
    'borrower_salary': borrower.annual_income ? String(borrower.annual_income) : '',
    'annual_income': borrower.annual_income ? String(borrower.annual_income) : '',
    
    // Loan Information
    'loan_type': loan.loan_type || '',
    'loan_term': loan.term_months ? String(loan.term_months) : '',
    'interest_rate': String(interestRate),
    'monthly_payment': loan.monthly_payment ? String(loan.monthly_payment) : '',
    
    // Reference 1
    'borrower_reference_name_1': borrower.reference1_name || '',
    'borrower_reference_phone_1': borrower.reference1_phone || '',
    'borrower_reference_name_1 _country_code': borrower.reference1_country_code || '+1',
    'reference1_email': borrower.reference1_email || '',
    
    // Reference 2
    'borrower_reference_name_2': borrower.reference2_name || '',
    'borrower_reference_phone_2': borrower.reference2_phone || '',
    'borrower_reference_name_2_country_code': borrower.reference2_country_code || '+1',
    'reference2_email': borrower.reference2_email || '',
    
    // Reference 3
    'borrower_reference_name_3': borrower.reference3_name || '',
    'borrower_reference_name_3_phone': borrower.reference3_phone || '',
    'reference3_email': borrower.reference3_email || '',
  };
  
  // Add payment schedule fields (exp_date, principal_amount, payment_amount, balance for 1-16)
  if (loan.payment_schedule && loan.payment_schedule.length > 0) {
    loan.payment_schedule.forEach((payment, index) => {
      const num = index + 1;
      if (num <= 16) {
        fieldMapping[`exp_date_${num}`] = payment.due_date || '';
        fieldMapping[`principal_amount_${num}`] = payment.principal_amount ? String(Number(payment.principal_amount).toFixed(2)) : '';
        fieldMapping[`payment_amount_${num}`] = payment.total_amount ? String(Number(payment.total_amount).toFixed(2)) : '';
        fieldMapping[`balance_${num}`] = payment.remaining_balance ? String(Number(payment.remaining_balance).toFixed(2)) : '';
      }
    });
  }
  
  // Filter out empty values
  return Object.fromEntries(
    Object.entries(fieldMapping).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );
}

/**
 * Validates that required fields are present
 * Returns an array of missing field names
 */
export function validateRequiredFields(loan: LoanApplicationData): string[] {
  const missingFields: string[] = [];
  
  const borrower = loan.borrower;
  
  // Check required borrower fields
  if (!borrower.first_name) missingFields.push('First Name');
  if (!borrower.last_name) missingFields.push('Last Name');
  if (!borrower.email) missingFields.push('Email');
  if (!borrower.phone && !loan.verified_phone_number) missingFields.push('Phone Number');
  
  // Check required loan fields - support both amount and principal_amount
  if (!loan.amount && !loan.principal_amount) missingFields.push('Loan Amount');
  
  return missingFields;
}

/**
 * Gets borrower full name
 */
export function getBorrowerFullName(loan: LoanApplicationData): string {
  return `${loan.borrower.first_name} ${loan.borrower.last_name}`.trim();
}

/**
 * Gets borrower email
 */
export function getBorrowerEmail(loan: LoanApplicationData): string {
  return loan.borrower.email;
}
