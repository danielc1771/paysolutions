'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Calendar, CreditCard, DollarSign, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { PaymentScheduleItem } from '@/utils/payment-schedule';
import { LoanSummary } from '@/types/loan';

export default function PaymentSummaryPage() {
  const params = useParams();
  const loanId = params?.loanId as string;
  
  const [loan, setLoan] = useState<LoanSummary | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loanId) return;

    const fetchLoanData = async () => {
      try {
        setLoading(true);
        
        // Fetch loan details
        const loanResponse = await fetch(`/api/loans/${loanId}/summary`);
        if (!loanResponse.ok) {
          throw new Error('Failed to fetch loan details');
        }
        const loanData = await loanResponse.json();
        setLoan(loanData);

        // Fetch payment schedule
        const scheduleResponse = await fetch(`/api/loans/${loanId}/payment-schedule`);
        if (!scheduleResponse.ok) {
          throw new Error('Failed to fetch payment schedule');
        }
        const scheduleData = await scheduleResponse.json();
        setPaymentSchedule(scheduleData);
        
      } catch (err) {
        console.error('Error fetching loan data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load loan information');
      } finally {
        setLoading(false);
      }
    };

    fetchLoanData();
  }, [loanId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment information...</p>
        </div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            Unable to Load Payment Information
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'The payment information could not be found.'}
          </p>
        </div>
      </div>
    );
  }

  const totalAmount = parseFloat(loan.principal_amount);
  const weeklyPayment = parseFloat(loan.weekly_payment);
  const interestRate = parseFloat(loan.interest_rate);
  const termWeeks = parseInt(loan.term_weeks);
  
  const totalInterest = paymentSchedule.reduce((sum, payment) => sum + payment.interestPayment, 0);
  const totalPayments = totalAmount + totalInterest;
  
  const paidPayments = paymentSchedule.filter(p => p.status === 'paid').length;
  const nextPayment = paymentSchedule.find(p => p.status === 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Summary
          </h1>
          <p className="text-gray-600">
            Your loan payment schedule and details
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Loan Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Loan Overview Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Loan Overview</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Borrower</span>
                  <span className="font-semibold text-gray-900">{loan.borrower_name}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Loan Amount</span>
                  <span className="font-semibold text-gray-900">
                    ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Interest Rate</span>
                  <span className="font-semibold text-gray-900">{interestRate}% APR</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Term</span>
                  <span className="font-semibold text-gray-900">{termWeeks} weeks</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Weekly Payment</span>
                  <span className="font-semibold text-blue-600 text-lg">
                    ${weeklyPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Summary Card */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Summary</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total of Payments</span>
                  <span className="font-semibold text-gray-900">
                    ${totalPayments.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Interest</span>
                  <span className="font-semibold text-gray-900">
                    ${totalInterest.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payments Made</span>
                  <span className="font-semibold text-green-600">
                    {paidPayments} of {termWeeks}
                  </span>
                </div>
              </div>
            </div>

            {/* Next Payment Card */}
            {nextPayment && (
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <h2 className="text-xl font-bold mb-4">Next Payment Due</h2>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span className="text-lg font-semibold">
                      {new Date(nextPayment.dueDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    <span className="text-2xl font-bold">
                      ${nextPayment.totalPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  <div className="text-sm opacity-90">
                    Payment #{nextPayment.paymentNumber}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Payment Schedule */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Payment Schedule</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">#</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Due Date</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">Payment</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">Principal</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">Interest</th>
                      <th className="text-right py-3 px-2 font-semibold text-gray-700">Balance</th>
                      <th className="text-center py-3 px-2 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentSchedule.map((payment, index) => (
                      <tr 
                        key={index} 
                        className={`border-b border-gray-100 hover:bg-gray-50 ${
                          payment.status === 'paid' ? 'bg-green-50' : 
                          payment.status === 'overdue' ? 'bg-red-50' : ''
                        }`}
                      >
                        <td className="py-3 px-2 text-sm font-medium text-gray-900">
                          {payment.paymentNumber}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-700">
                          {new Date(payment.dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-2 text-sm font-semibold text-right text-gray-900">
                          ${payment.totalPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-sm text-right text-gray-700">
                          ${payment.principalPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-sm text-right text-gray-700">
                          ${payment.interestPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-sm text-right text-gray-700">
                          ${payment.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {payment.status === 'paid' && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                              <CheckCircle className="w-3 h-3" />
                              Paid
                            </div>
                          )}
                          {payment.status === 'pending' && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                              <Clock className="w-3 h-3" />
                              Pending
                            </div>
                          )}
                          {payment.status === 'overdue' && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                              <AlertCircle className="w-3 h-3" />
                              Overdue
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
              <CreditCard className="w-5 h-5" />
              <span className="text-sm">Automatic payments are set up for this loan</span>
            </div>
            <p className="text-xs text-gray-500">
              Payments will be automatically charged to your saved payment method on each due date.
              If you have questions about your loan, please contact our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
