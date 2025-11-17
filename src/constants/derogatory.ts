/**
 * Derogatory Account Constants
 * Predefined reasons for marking loans as derogatory
 */

export const DEROGATORY_REASONS = [
  { value: 'repossession', label: 'Repossession' },
  { value: 'accident', label: 'Accident/Total Loss' },
  { value: 'trade_in', label: 'Trade-in' },
  { value: 'return', label: 'Return' },
  { value: 'exchange', label: 'Exchange' },
  { value: 'natural_disaster', label: 'Natural Disaster' },
  { value: 'voluntary_surrender', label: 'Voluntary Surrender' },
  { value: 'missed_payments', label: 'Consecutive Missed Payments' },
  { value: 'other', label: 'Other' },
] as const;

export const CLOSURE_REASONS = [
  { value: 'trade_in', label: 'Trade-in' },
  { value: 'early_payoff', label: 'Early Payoff' },
  { value: 'refinanced', label: 'Refinanced' },
  { value: 'dealer_agreement', label: 'Dealer Agreement' },
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'other', label: 'Other' },
] as const;

export type DerogatoryReason = typeof DEROGATORY_REASONS[number]['value'];
export type ClosureReason = typeof CLOSURE_REASONS[number]['value'];

/**
 * Get display label for a derogatory reason
 */
export function getDerogatoryReasonLabel(reason: string): string {
  const found = DEROGATORY_REASONS.find(r => r.value === reason);
  return found ? found.label : reason;
}

/**
 * Get display label for a closure reason
 */
export function getClosureReasonLabel(reason: string): string {
  const found = CLOSURE_REASONS.find(r => r.value === reason);
  return found ? found.label : reason;
}
