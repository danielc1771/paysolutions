import { createClient } from '@/utils/supabase/server';
import { LoanForSchedule } from '@/types/loan';
import { getEffectiveInterestRate } from '@/utils/interest-config';

export interface PaymentScheduleItem {
  paymentNumber: number;
  dueDate: string;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  remainingBalance: number;
  status: 'pending' | 'paid' | 'overdue';
}

// Generate payment schedule for a loan
// Uses interest configuration to handle zero interest scenarios
export function generatePaymentSchedule(loan: LoanForSchedule): PaymentScheduleItem[] {
  const schedule: PaymentScheduleItem[] = [];
  const weeklyPayment = parseFloat(loan.weekly_payment);
  const principalAmount = parseFloat(loan.principal_amount);
  const storedRate = parseFloat(loan.interest_rate) / 100; // Convert percentage to decimal
  const effectiveRate = getEffectiveInterestRate(storedRate); // Apply interest configuration
  const weeklyRate = effectiveRate / 52; // Weekly interest rate (will be 0 when disabled)
  const termWeeks = parseInt(loan.term_weeks);
  
  let remainingBalance = principalAmount;
  const startDate = new Date(loan.funding_date || loan.created_at);
  
  for (let i = 1; i <= termWeeks; i++) {
    const paymentDate = new Date(startDate);
    paymentDate.setDate(paymentDate.getDate() + (i * 7)); // Add weeks instead of months
    
    // Interest payment will be 0 when interest calculations are disabled
    const interestPayment = remainingBalance * weeklyRate;
    const principalPayment = weeklyPayment - interestPayment;
    remainingBalance = Math.max(0, remainingBalance - principalPayment);
    
    schedule.push({
      paymentNumber: i,
      dueDate: paymentDate.toISOString().split('T')[0],
      principalPayment: Math.round(principalPayment * 100) / 100,
      interestPayment: Math.round(interestPayment * 100) / 100, // Will be 0.00 when disabled
      totalPayment: Math.round(weeklyPayment * 100) / 100,
      remainingBalance: Math.round(remainingBalance * 100) / 100,
      status: 'pending'
    });
  }
  
  return schedule;
}

// Store payment schedule in database
export async function storePaymentSchedule(loanId: string, schedule: PaymentScheduleItem[]) {
  const supabase = await createClient();
  
  // First, delete any existing schedule for this loan
  await supabase
    .from('payment_schedules')
    .delete()
    .eq('loan_id', loanId);
  
  // Insert new schedule
  const scheduleData = schedule.map(item => ({
    loan_id: loanId,
    payment_number: item.paymentNumber,
    due_date: item.dueDate,
    principal_amount: item.principalPayment,
    interest_amount: item.interestPayment,
    total_amount: item.totalPayment,
    remaining_balance: item.remainingBalance,
    status: item.status
  }));
  
  const { error } = await supabase
    .from('payment_schedules')
    .insert(scheduleData);
  
  if (error) {
    console.error('Error storing payment schedule:', error);
    throw new Error('Failed to store payment schedule');
  }
  
  return scheduleData;
}

// Get payment schedule from database, with fallback to generate if not found
export async function getPaymentSchedule(loanId: string): Promise<PaymentScheduleItem[]> {
  const supabase = await createClient();
  
  try {
    // First try to get existing payment schedule
    const { data, error } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_number');
    
    if (error) {
      console.error('Error fetching payment schedule:', error);
      // If table doesn't exist or other DB error, try to generate schedule
      return await generateAndStorePaymentSchedule(loanId);
    }
    
    // If we have data, return it
    if (data && data.length > 0) {
      return data.map(item => ({
        paymentNumber: item.payment_number,
        dueDate: item.due_date,
        principalPayment: parseFloat(item.principal_amount),
        interestPayment: parseFloat(item.interest_amount),
        totalPayment: parseFloat(item.total_amount),
        remainingBalance: parseFloat(item.remaining_balance),
        status: item.status || 'pending'
      }));
    }
    
    // If no data found, generate and store the schedule
    console.log('No payment schedule found for loan:', loanId, 'Generating new schedule...');
    return await generateAndStorePaymentSchedule(loanId);
    
  } catch (error) {
    console.error('Error in getPaymentSchedule:', error);
    // As a last resort, try to generate schedule without storing
    return await generateAndStorePaymentSchedule(loanId);
  }
}

// Helper function to generate and store payment schedule
async function generateAndStorePaymentSchedule(loanId: string): Promise<PaymentScheduleItem[]> {
  const supabase = await createClient();
  
  try {
    // Get loan details
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        principal_amount,
        interest_rate,
        term_weeks,
        weekly_payment,
        funding_date,
        created_at
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('Error fetching loan for schedule generation:', loanError);
      throw new Error('Loan not found');
    }

    // Generate the payment schedule
    const schedule = generatePaymentSchedule({
      id: loan.id,
      principal_amount: loan.principal_amount,
      interest_rate: loan.interest_rate,
      term_weeks: loan.term_weeks,
      weekly_payment: loan.weekly_payment,
      funding_date: loan.funding_date,
      created_at: loan.created_at
    });

    // Try to store the schedule in the database
    try {
      await storePaymentSchedule(loanId, schedule);
      console.log('Successfully generated and stored payment schedule for loan:', loanId);
    } catch (storeError) {
      console.warn('Failed to store payment schedule, but returning generated schedule:', storeError);
      // Continue with the generated schedule even if storage fails
    }

    return schedule;
    
  } catch (error) {
    console.error('Error generating payment schedule:', error);
    throw new Error('Failed to generate payment schedule');
  }
}
