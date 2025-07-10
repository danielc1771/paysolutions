// Base types for loan-related data structures
// Based on the database schema in src/drizzle/schema/schema.ts

export interface BaseBorrower {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  employment_status?: string;
  annual_income?: string;
  current_employer_name?: string;
  time_with_employment?: string;
  kyc_status?: string;
  reference1_name?: string;
  reference1_phone?: string;
  reference1_email?: string;
  reference2_name?: string;
  reference2_phone?: string;
  reference2_email?: string;
  reference3_name?: string;
  reference3_phone?: string;
  reference3_email?: string;
}

export interface BaseOrganization {
  id: string;
  name: string;
}

export interface BaseVehicle {
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_vin: string;
}

// Core loan interface matching the database schema
export interface BaseLoan {
  id: string;
  loan_number: string;
  borrower_id: string;
  principal_amount: string;
  interest_rate: string;
  term_weeks: number;
  weekly_payment: string;
  purpose?: string;
  status: string;
  funding_date?: string;
  remaining_balance?: string;
  docusign_envelope_id?: string;
  docusign_status: string;
  docusign_status_updated?: string;
  docusign_completed_at?: string;
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_vin: string;
  created_at: string;
  updated_at: string;
  organization_id: string;
  application_step: number;
  stripe_verification_session_id?: string;
  stripe_verification_status: string;
  phone_verification_session_id?: string;
  phone_verification_status: string;
  verified_phone_number?: string;
}

// Loan with populated borrower information
export interface LoanWithBorrower extends BaseLoan {
  borrower: BaseBorrower;
}

// Loan with populated organization information
export interface LoanWithOrganization extends BaseLoan {
  organization: BaseOrganization;
}

// Loan with both borrower and organization information
export interface LoanWithBorrowerAndOrganization extends BaseLoan {
  borrower: BaseBorrower;
  organization: BaseOrganization;
}

// Simplified loan interface for list views
export interface LoanListItem {
  id: string;
  loan_number: string;
  principal_amount: string;
  interest_rate: string;
  term_weeks: number;
  weekly_payment: string;
  status: string;
  borrower: {
    first_name: string;
    last_name: string;
    email: string;
    kyc_status?: string;
  };
  docusign_status: string;
  created_at: string;
  purpose: string;
  remaining_balance: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: string;
}

// Admin loan list item with organization info
export interface AdminLoanListItem extends LoanListItem {
  organization: {
    id: string;
    name: string;
  };
}

// Loan for payment schedule calculations
export interface LoanForSchedule {
  id: string;
  principal_amount: string;
  interest_rate: string;
  term_weeks: string;
  weekly_payment: string;
  funding_date?: string;
  created_at: string;
}

// Loan for DocuSign templates
export interface LoanForDocuSign {
  loanNumber: string;
  principalAmount: number;
  interestRate: number;
  termWeeks: number;
  weeklyPayment: number;
  purpose: string;
  borrower: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
    ssn: string;
    dateOfBirth: string;
    employmentStatus: string;
    annualIncome: number;
    currentEmployerName?: string;
    timeWithEmployment?: string;
    reference1Name?: string;
    reference1Phone?: string;
    reference1Email?: string;
    reference2Name?: string;
    reference2Phone?: string;
    reference2Email?: string;
    reference3Name?: string;
    reference3Phone?: string;
    reference3Email?: string;
  };
  vehicle: {
    year: string;
    make: string;
    model: string;
    vin: string;
  }
}

// Loan application data for the application form
export interface LoanApplicationData {
  borrower: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  };
  loan: {
    principal_amount: number;
    vehicleYear: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleVin: string;
    applicationStep: number;
    stripeVerificationSessionId?: string;
  };
  dealerName: string;
  loanId: string;
}

// Loan summary for payment summary page
export interface LoanSummary {
  id: string;
  remaining_balance: string;
  loan_number: string;
  borrower_name: string;
  principal_amount: string;
  interest_rate: string;
  term_weeks: string;
  weekly_payment: string;
  funding_date: string;
  status: string;
}

// Loan creation data for API requests
export interface CreateLoanData {
  borrower_id: string;
  principal_amount: number;
  interest_rate: number;
  term_weeks: number;
  weekly_payment: number;
  purpose?: string;
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_vin: string;
  organization_id: string;
}

// Loan update data for API requests
export interface UpdateLoanData {
  principal_amount?: number;
  interest_rate?: number;
  term_weeks?: number;
  weekly_payment?: number;
  purpose?: string;
  status?: string;
  funding_date?: string;
  remaining_balance?: string;
  docusign_envelope_id?: string;
  docusign_status?: string;
  vehicle_year?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_vin?: string;
  application_step?: number;
  stripe_verification_session_id?: string;
  stripe_verification_status?: string;
  phone_verification_session_id?: string;
  phone_verification_status?: string;
  verified_phone_number?: string;
}

// Loan status enum
export type LoanStatus = 'new' | 'pending' | 'approved' | 'funded' | 'active' | 'paid_off' | 'defaulted' | 'cancelled';

// DocuSign status enum
export type DocuSignStatus = 'not_sent' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided';

// Stripe verification status enum
export type StripeVerificationStatus = 'pending' | 'requires_action' | 'verified' | 'canceled' | 'unverified' | 'processing' | 'completed';

// Phone verification status enum
export type PhoneVerificationStatus = 'pending' | 'sent' | 'verified' | 'failed' | 'expired';