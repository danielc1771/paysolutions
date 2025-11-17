/**
 * Converts text to proper case (Title Case)
 * Examples:
 * - "hello world" -> "Hello World"
 * - "HELLO WORLD" -> "Hello World"
 * - "hello_world" -> "Hello World"
 */
export function toProperCase(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Formats status text to proper case
 * Examples:
 * - "active" -> "Active"
 * - "action_required" -> "Action Required"
 * - "ipay_approved" -> "iPay Approved"
 */
export function formatStatus(status: string): string {
  if (!status) return '';
  
  // Special cases for specific statuses
  const specialCases: Record<string, string> = {
    'ipay_approved': 'iPay Approved',
    'kyc': 'KYC',
    'new': 'New',
    'active': 'Active',
    'inactive': 'Inactive',
    'trial': 'Trial',
    'suspended': 'Suspended',
    'cancelled': 'Cancelled',
    'pending': 'Pending',
    'completed': 'Completed',
    'failed': 'Failed',
    'expired': 'Expired',
  };
  
  const lowerStatus = status.toLowerCase();
  if (specialCases[lowerStatus]) {
    return specialCases[lowerStatus];
  }
  
  return toProperCase(status);
}

/**
 * Formats a person's name to proper case
 * Examples:
 * - "john doe" -> "John Doe"
 * - "JANE SMITH" -> "Jane Smith"
 */
export function formatName(name: string): string {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formats email to lowercase (standard email format)
 */
export function formatEmail(email: string): string {
  if (!email) return '';
  return email.toLowerCase();
}
