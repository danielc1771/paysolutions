/**
 * Loan calculation utilities with client-specified rules
 * Supports toggling interest calculations via environment configuration
 */

import { getEffectiveInterestRate, calculatePaymentAmount, INTEREST_CONFIG } from './interest-config';

export interface LoanTermOption {
  weeks: number;
  label: string;
}

export interface LoanCalculation {
  principalAmount: number;
  termWeeks: number;
  annualInterestRate: number;
  weeklyInterestRate: number;
  weeklyPayment: number;
  totalPayment: number;
  totalInterest: number;
}

/**
 * Get available loan term options - universal 16-week cap for all loan amounts
 * Rules:
 * - All loan amounts: 4, 6, 8, 12, 16 weeks available
 * - Maximum 16 weeks for any loan amount
 */
export function getAvailableTerms(): LoanTermOption[] {
  // All loan amounts now get the same term options - parameter no longer needed
  return [
    { weeks: 4, label: '4 weeks' },
    { weeks: 6, label: '6 weeks' },
    { weeks: 8, label: '8 weeks' },
    { weeks: 12, label: '12 weeks' },
    { weeks: 16, label: '16 weeks' }
  ];
}

/**
 * Calculate loan payment details
 * Uses 30% annual interest rate when interest is enabled, 0% when disabled
 * Automatically adjusts based on ENABLE_INTEREST_CALCULATIONS environment variable
 */
export function calculateLoanPayment(
  principalAmount: number,
  termWeeks: number,
  annualInterestRate: number = INTEREST_CONFIG.DEFAULT_ANNUAL_RATE
): LoanCalculation {
  // Apply interest configuration - returns 0 if interest is disabled
  const effectiveRate = getEffectiveInterestRate(annualInterestRate);
  const weeklyInterestRate = effectiveRate / 52;
  
  // Calculate weekly payment using interest configuration
  const weeklyPayment = calculatePaymentAmount(principalAmount, termWeeks, effectiveRate);

  const totalPayment = weeklyPayment * termWeeks;
  const totalInterest = totalPayment - principalAmount;

  return {
    principalAmount,
    termWeeks,
    annualInterestRate: effectiveRate, // Return effective rate (0 when disabled)
    weeklyInterestRate,
    weeklyPayment: Math.round(weeklyPayment * 100) / 100, // Round to nearest cent
    totalPayment: Math.round(totalPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
  };
}

/**
 * Generate weekly payment schedule
 */
export interface WeeklyPaymentScheduleItem {
  paymentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalPayment: number;
  remainingBalance: number;
}

export function generateWeeklyPaymentSchedule(
  calculation: LoanCalculation,
  startDate: Date = new Date()
): WeeklyPaymentScheduleItem[] {
  const schedule: WeeklyPaymentScheduleItem[] = [];
  let remainingBalance = calculation.principalAmount;

  for (let i = 1; i <= calculation.termWeeks; i++) {
    // Interest amount will be 0 when interest calculations are disabled
    const interestAmount = remainingBalance * calculation.weeklyInterestRate;
    const principalAmount = calculation.weeklyPayment - interestAmount;
    remainingBalance = Math.max(0, remainingBalance - principalAmount);

    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + (i * 7));

    schedule.push({
      paymentNumber: i,
      dueDate: dueDate.toISOString().split('T')[0],
      principalAmount: Math.round(principalAmount * 100) / 100,
      interestAmount: Math.round(interestAmount * 100) / 100, // Will be 0.00 when disabled
      totalPayment: calculation.weeklyPayment,
      remainingBalance: Math.round(remainingBalance * 100) / 100,
    });
  }

  return schedule;
}

/**
 * Validate loan term - universal validation for all loan amounts
 */
export function validateLoanTerms(termWeeks: number): boolean {
  // Valid terms are now universal: 4, 6, 8, 12, 16 weeks for any amount
  const validTerms = [4, 6, 8, 12, 16];
  return validTerms.includes(termWeeks);
}