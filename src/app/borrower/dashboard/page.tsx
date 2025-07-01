'use client';

import { createClient } from '@/utils/supabase/client';
import BorrowerLayout from '@/components/BorrowerLayout';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RoleRedirect } from '@/components/auth/RoleRedirect';

interface Loan {
  id: string;
  loan_number: string;
  principal_amount: string;
  interest_rate: string;
  term_months: number;
  monthly_payment: string;
  status: string;
  docusign_status: string;
  remaining_balance: string;
  funding_date: string;
  created_at: string;
}

interface PaymentSchedule {
  id: string;
  payment_number: number;
  due_date: string;
  total_amount: string;
  status: string;
  paid_date: string;
  paid_amount: string;
}

export default function BorrowerDashboard() {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [paymentSchedules, setPaymentSchedules] = useState<PaymentSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchBorrowerData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        // Get borrower's loan based on their email
        const { data: borrowerData, error: borrowerError } = await supabase
          .from('borrowers')
          .select('id, email')
          .eq('email', user.email)
          .single();

        if (borrowerError || !borrowerData) {
          setError('Could not find borrower information');
          setLoading(false);
          return;
        }

        // Get the loan for this borrower
        const { data: loanData, error: loanError } = await supabase
          .from('loans')
          .select('*')
          .eq('borrower_id', borrowerData.id)
          .single();

        if (loanError || !loanData) {
          setError('Could not find loan information');
          setLoading(false);
          return;
        }

        setLoan(loanData);

        // Get payment schedules for this loan
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('payment_schedules')
          .select('*')
          .eq('loan_id', loanData.id)
          .order('payment_number', { ascending: true });

        if (!schedulesError && schedulesData) {
          setPaymentSchedules(schedulesData);
        }

      } catch (err) {
        setError('Failed to fetch loan information');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBorrowerData();
  }, [supabase]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'application_sent': return 'bg-yellow-100 text-yellow-800';
      case 'application_completed': return 'bg-orange-100 text-orange-800';
      case 'review': return 'bg-orange-100 text-orange-800';
      case 'signed': return 'bg-purple-100 text-purple-800';
      case 'funded': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate loan stats
  const totalPaid = paymentSchedules
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.paid_amount || '0'), 0);
  
  const upcomingPayments = paymentSchedules.filter(p => p.status === 'pending').slice(0, 3);
  const nextPayment = upcomingPayments[0];

  return (
    <RoleRedirect allowedRoles={['borrower']}>
      <BorrowerLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
          <div className="p-8">
            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-500 mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-600 font-medium">Loading your loan information...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load loan information</h3>
                  <p className="text-red-600 mb-4">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-red-500 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-red-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : !loan ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">No loan found</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">We couldn&apos;t find any loan information associated with your account.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Dashboard Header */}
                <div className="mb-8">
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                      Welcome Back!
                    </h1>
                    <p className="text-gray-600 text-lg">Here&apos;s your loan overview and payment information</p>
                  </div>
                </div>

                {/* Loan Overview Card */}
                <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl p-8 mb-10 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">Your Loan</h2>
                        <p className="text-blue-100">Loan #{loan.loan_number}</p>
                      </div>
                      <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(loan.status)} border border-white/20`}>
                        {loan.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="text-blue-200 text-sm mb-1">Principal Amount</p>
                        <p className="text-3xl font-bold">${parseFloat(loan.principal_amount).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-blue-200 text-sm mb-1">Monthly Payment</p>
                        <p className="text-3xl font-bold">${parseFloat(loan.monthly_payment).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-blue-200 text-sm mb-1">Interest Rate</p>
                        <p className="text-3xl font-bold">{(parseFloat(loan.interest_rate) * 100).toFixed(2)}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                  <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-800">${totalPaid.toLocaleString()}</p>
                      </div>
                    </div>
                    <h3 className="text-gray-700 font-semibold text-lg">Total Paid</h3>
                    <p className="text-gray-500 text-sm mt-1">Payments made</p>
                  </div>

                  <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-4 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-800">
                          ${loan.remaining_balance ? parseFloat(loan.remaining_balance).toLocaleString() : parseFloat(loan.principal_amount).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <h3 className="text-gray-700 font-semibold text-lg">Remaining Balance</h3>
                    <p className="text-gray-500 text-sm mt-1">Amount left to pay</p>
                  </div>

                  <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-800">{loan.term_months}</p>
                      </div>
                    </div>
                    <h3 className="text-gray-700 font-semibold text-lg">Loan Term</h3>
                    <p className="text-gray-500 text-sm mt-1">Months</p>
                  </div>

                  <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-4 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-800">{paymentSchedules.length}</p>
                      </div>
                    </div>
                    <h3 className="text-gray-700 font-semibold text-lg">Total Payments</h3>
                    <p className="text-gray-500 text-sm mt-1">Scheduled payments</p>
                  </div>
                </div>

                {/* Next Payment */}
                {nextPayment && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 mb-10 shadow-xl border border-white/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Next Payment Due</h3>
                        <p className="text-gray-600 mb-4">Payment #{nextPayment.payment_number}</p>
                        <div className="flex items-center space-x-6">
                          <div>
                            <p className="text-sm text-gray-500">Due Date</p>
                            <p className="text-xl font-bold text-gray-900">{formatDate(nextPayment.due_date)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Amount</p>
                            <p className="text-xl font-bold text-gray-900">${parseFloat(nextPayment.total_amount).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      <Link
                        href="/borrower/payments"
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-4 rounded-2xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
                      >
                        <span>Make Payment</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Recent Payments */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                  <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Schedule</h2>
                        <p className="text-gray-600">Track your payment history and upcoming payments</p>
                      </div>
                      <Link
                        href="/borrower/payments"
                        className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-2xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                      >
                        <span>View All</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {paymentSchedules.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No payment schedule available yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {paymentSchedules.slice(0, 5).map((payment) => (
                          <div 
                            key={payment.id}
                            className="group bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/30"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-6">
                                <div className="flex-shrink-0">
                                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                                    payment.status === 'paid' ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
                                    payment.status === 'overdue' ? 'bg-gradient-to-br from-red-400 to-pink-500' :
                                    'bg-gradient-to-br from-blue-400 to-indigo-500'
                                  }`}>
                                    <span className="text-white font-bold text-lg">#{payment.payment_number}</span>
                                  </div>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h3 className="text-lg font-bold text-gray-900">
                                      Payment #{payment.payment_number}
                                    </h3>
                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(payment.status)}`}>
                                      {payment.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                                    <span className="flex items-center">
                                      <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      Due: {formatDate(payment.due_date)}
                                    </span>
                                    {payment.paid_date && (
                                      <span className="flex items-center">
                                        <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Paid: {formatDate(payment.paid_date)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900">
                                  ${parseFloat(payment.paid_amount || payment.total_amount).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-500 font-medium">
                                  {payment.status === 'paid' ? 'Paid Amount' : 'Amount Due'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </BorrowerLayout>
    </RoleRedirect>
  );
}