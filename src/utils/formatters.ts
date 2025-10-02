/**
 * Utility functions for formatting data for display
 */

/**
 * Formats loan status from database format to display format
 * @param status - The loan status from the database (e.g., "application_sent")
 * @returns Formatted status for display (e.g., "Application Sent")
 */
export function formatLoanStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'new': 'New',
    'application_sent': 'Application Sent',
    'application_in_progress': 'Application In Progress',
    'application_completed': 'Application Completed',
    'pending_ipay_signature': 'Pending iPay Signature',
    'pending_org_signature': 'Pending Organization Signature',
    'pending_borrower_signature': 'Pending Borrower Signature',
    'ipay_approved': 'iPay Approved',
    'dealer_approved': 'Dealer Approved',
    'fully_signed': 'Fully Signed',
    'review': 'Under Review',
    'approved': 'Approved',
    'funded': 'Funded',
    'active': 'Active',
    'closed': 'Closed',
    'defaulted': 'Defaulted',
  };

  return statusMap[status] || status.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Formats DocuSign status from database format to display format
 * @param status - The DocuSign status from the database
 * @returns Formatted status for display
 */
export function formatDocuSignStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'not_sent': 'Not Sent',
    'sent': 'Sent',
    'delivered': 'Delivered',
    'signed': 'Signed',
    'completed': 'Completed',
    'declined': 'Declined',
    'voided': 'Voided',
  };

  return statusMap[status] || status.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Formats KYC status from database format to display format
 * @param status - The KYC status from the database
 * @returns Formatted status for display
 */
export function formatKycStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pending',
    'verified': 'Verified',
    'completed': 'Completed',
    'failed': 'Failed',
    'rejected': 'Rejected',
  };

  return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
}
