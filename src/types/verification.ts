// TypeScript types for Standalone Verifications feature

export type VerificationStatus =
  | 'pending'
  | 'email_sent'
  | 'in_progress'
  | 'identity_verified'
  | 'phone_verified'
  | 'completed'
  | 'failed'
  | 'expired';

export type StripeVerificationStatus =
  | 'pending'
  | 'requires_action'
  | 'verified'
  | 'canceled'
  | 'unverified'
  | 'processing'
  | 'completed';

export type PhoneVerificationStatus =
  | 'pending'
  | 'sent'
  | 'verified'
  | 'failed'
  | 'expired';

// Base verification interface matching database schema
export interface Verification {
  id: string;
  organization_id: string;
  created_by: string | null;

  // Person Information
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;

  // Address
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;

  // Stripe Identity Verification
  stripe_verification_session_id: string | null;
  stripe_verification_status: StripeVerificationStatus;
  stripe_verified_at: string | null;
  stripe_verification_url: string | null;

  // Phone Verification
  phone_verification_session_id: string | null;
  phone_verification_status: PhoneVerificationStatus;
  verified_phone_number: string | null;
  phone_verified_at: string | null;

  // Verification Results
  verification_result_data: string | null; // JSON string
  document_type: string | null;

  // Status and Metadata
  status: VerificationStatus;
  purpose: string | null;
  verification_token: string;
  expires_at: string | null;
  completed_at: string | null;

  // Email tracking
  email_sent_at: string | null;
  email_sent_count: number;

  // Audit
  created_at: string;
  updated_at: string;
}

// Parsed verification result data from Stripe
export interface VerificationResultData {
  id_number?: string;
  first_name?: string;
  last_name?: string;
  dob?: {
    day: number | null;
    month: number | null;
    year: number | null;
  };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  document_type?: string;
  issuing_country?: string;
}

// List item for table view
export interface VerificationListItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: VerificationStatus;
  stripe_verification_status: StripeVerificationStatus;
  phone_verification_status: PhoneVerificationStatus;
  created_at: string;
  completed_at: string | null;
  expires_at: string | null;
  organization_id: string;
  organization?: {
    id: string;
    name: string;
  };
}

// Detail view with creator information
export interface VerificationWithCreator extends Verification {
  creator?: {
    full_name: string | null;
    email: string | null;
  } | null;
  organization?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

// Admin list item with organization info
export interface AdminVerificationListItem extends VerificationListItem {
  organization: {
    id: string;
    name: string;
  };
}

// Form input for creating new verification
export interface CreateVerificationInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  purpose?: string;
}

// Form validation errors
export interface CreateVerificationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  purpose?: string;
}

// API response for creating verification
export interface CreateVerificationResponse {
  success: boolean;
  verification?: Verification;
  verificationUrl?: string; // Public URL for customer to complete verification
  error?: string;
}

// API response for listing verifications
export interface ListVerificationsResponse {
  success: boolean;
  verifications?: VerificationListItem[] | AdminVerificationListItem[];
  total?: number;
  error?: string;
}

// API response for getting single verification
export interface GetVerificationResponse {
  success: boolean;
  verification?: VerificationWithCreator;
  error?: string;
}

// API response for verification actions (resend, complete, etc.)
export interface VerificationActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Status for verification timeline component
export interface VerificationTimelineStep {
  label: string;
  status: 'completed' | 'in-progress' | 'pending' | 'failed';
  timestamp?: string;
  description?: string;
}

// Props for verification components
export interface VerificationStatusBadgeProps {
  status: VerificationStatus;
  stripeStatus?: StripeVerificationStatus;
  phoneStatus?: PhoneVerificationStatus;
  size?: 'sm' | 'md' | 'lg';
}

export interface VerificationTimelineProps {
  verification: Verification | VerificationWithCreator;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Organization settings related to verifications
export interface OrganizationVerificationSettings {
  enableStandaloneVerifications: boolean;
  verificationsRequirePhone: boolean;
}
