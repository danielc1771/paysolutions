/**
 * Interest calculation configuration utility
 * Centralized control for enabling/disabling interest calculations system-wide
 */

/**
 * Check if interest calculations are enabled
 * Controlled by ENABLE_INTEREST_CALCULATIONS environment variable
 * Defaults to false (no interest) for licensing compliance
 */
export function isInterestEnabled(): boolean {
  return process.env.ENABLE_INTEREST_CALCULATIONS === 'true';
}

/**
 * Get effective interest rate based on configuration
 * Returns 0 when interest is disabled, otherwise returns the provided rate
 */
export function getEffectiveInterestRate(requestedRate: number): number {
  return isInterestEnabled() ? requestedRate : 0;
}

/**
 * Configuration constants for interest calculations
 */
export const INTEREST_CONFIG = {
  // Default annual interest rate when enabled (30%)
  DEFAULT_ANNUAL_RATE: 0.30,
  
  // Whether to show interest-related UI elements
  SHOW_INTEREST_UI: isInterestEnabled(),
  
  // Whether to calculate interest in payment schedules
  CALCULATE_INTEREST: isInterestEnabled(),
  
  // Whether to display interest columns in documents
  SHOW_INTEREST_IN_DOCUMENTS: isInterestEnabled(),
} as const;

/**
 * Get display configuration for interest-related features
 */
export function getInterestDisplayConfig() {
  const enabled = isInterestEnabled();
  
  return {
    showInterestRate: enabled,
    showInterestAmount: enabled,
    showFinanceCharge: enabled,
    showInterestColumn: enabled,
    interestLabel: enabled ? 'Interest' : 'N/A',
    financeChargeLabel: enabled ? 'Finance Charge' : 'No Interest Applied',
  };
}

/**
 * Calculate payment amount based on interest configuration
 * When interest is disabled, payment = principal / term
 * When interest is enabled, uses standard amortization formula
 */
export function calculatePaymentAmount(
  principal: number,
  termWeeks: number,
  annualRate: number = INTEREST_CONFIG.DEFAULT_ANNUAL_RATE
): number {
  if (!isInterestEnabled()) {
    // Simple division when no interest
    return principal / termWeeks;
  }
  
  // Standard amortization formula when interest is enabled
  const weeklyRate = annualRate / 52;
  
  if (weeklyRate === 0) {
    return principal / termWeeks;
  }
  
  return principal * 
    (weeklyRate * Math.pow(1 + weeklyRate, termWeeks)) /
    (Math.pow(1 + weeklyRate, termWeeks) - 1);
}