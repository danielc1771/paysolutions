'use client';

import { createClient } from '@/utils/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Loan {
  id: string;
  loan_number: string;
  principal_amount: string;
  interest_rate: string;
  term_months: number;
  monthly_payment: string;
  status: string;
  borrower: {
    first_name: string;
    last_name: string;
    email: string;
    kyc_status: string;
  };
  docusign_status: string;
}

export default function AdminDashboard() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('loans')
          .select(`
            *,
            borrower:borrowers(
              first_name,
              last_name,
              email,
              kyc_status
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          setError(error.message);
          console.error('Error fetching loans:', error);
        } else {
          setLoans(data || []);
        }
      } catch (err) {
        setError('Failed to fetch loans');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-orange-100 text-orange-800';
      case 'signed': return 'bg-purple-100 text-purple-800';
      case 'funded': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate stats
  const totalLoans = loans?.length || 0;
  const activeLoans = loans?.filter(l => l.status === 'active').length || 0;
  const pendingLoans = loans?.filter(l => ['new', 'review'].includes(l.status)).length || 0;
  const totalPrincipal = loans?.reduce((sum, loan) => sum + parseFloat(loan.principal_amount), 0) || 0;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        <div className="p-8">
          {/* Dashboard Header */}
          <div className="mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
                Welcome Back!
              </h1>
              <p className="text-gray-600 text-lg">Here&apos;s what&apos;s happening with your loan portfolio today</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-800 mb-1">{pendingLoans}</p>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    +12% from last month
                  </div>
                </div>
              </div>
              <h3 className="text-gray-700 font-semibold text-lg">Pending Loans</h3>
              <p className="text-gray-500 text-sm mt-1">Awaiting review</p>
            </div>

            <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-800 mb-1">{activeLoans}</p>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    +8% from last month
                  </div>
                </div>
              </div>
              <h3 className="text-gray-700 font-semibold text-lg">Active Loans</h3>
              <p className="text-gray-500 text-sm mt-1">Currently funded</p>
            </div>

            <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-800 mb-1">{totalLoans}</p>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    +25% from last month
                  </div>
                </div>
              </div>
              <h3 className="text-gray-700 font-semibold text-lg">Total Loans</h3>
              <p className="text-gray-500 text-sm mt-1">All applications</p>
            </div>

            <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <div className="p-4 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-800 mb-1">${totalPrincipal.toLocaleString()}</p>
                  <div className="flex items-center text-green-600 text-sm font-medium">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    +18% from last month
                  </div>
                </div>
              </div>
              <h3 className="text-gray-700 font-semibold text-lg">Total Portfolio</h3>
              <p className="text-gray-500 text-sm mt-1">Principal amount</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-3xl p-8 mb-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-3">Ready to Create a New Loan?</h3>
                <p className="text-blue-100 text-lg mb-4">Streamlined loan processing with automated workflows and instant approvals</p>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Fast Processing
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Auto DocuSign
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Stripe Integration
                  </div>
                </div>
              </div>
              <Link
                href="/admin/loans/create"
                className="bg-white text-purple-600 px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all duration-300 hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <span>Create Loan</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Recent Loans */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Recent Loans</h2>
                  <p className="text-gray-600">Latest loan applications and their current status</p>
                </div>
                <Link
                  href="/admin/loans"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  <span>View All</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          
            {loading ? (
              <div className="p-12 text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-500 mx-auto"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">Loading your latest loans...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load loans</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-red-500 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-red-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : !loans || loans.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">No loans yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Get started by creating your first loan application. Our streamlined process makes it easy!</p>
                <Link
                  href="/admin/loans/create"
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-bold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create Your First Loan</span>
                </Link>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-4">
                  {loans.slice(0, 5).map((loan: any) => {
                    const needsAdminApproval = loan.docusign_status === 'signed' && loan.status !== 'funded';
                    
                    return (
                      <div 
                        key={loan.id} 
                        className={`group relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-white/30 ${needsAdminApproval ? 'ring-2 ring-orange-400 bg-orange-50/70' : ''}`}
                        onClick={() => window.location.href = `/admin/loans/${loan.id}`}
                      >
                        {needsAdminApproval && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-6">
                            <div className="flex-shrink-0">
                              <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-lg">
                                  {loan.borrower?.first_name?.[0]}{loan.borrower?.last_name?.[0]}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-lg font-bold text-gray-900 truncate">
                                  {loan.borrower?.first_name} {loan.borrower?.last_name}
                                </h3>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                                  {loan.status}
                                </span>
                                {needsAdminApproval && (
                                  <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-300">
                                    🚨 Action Required
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-6 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  {loan.loan_number}
                                </span>
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                  </svg>
                                  Personal Loan
                                </span>
                                <span className="flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  {loan.borrower?.email}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-8">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">
                                ${parseFloat(loan.principal_amount).toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500 font-medium">Principal Amount</p>
                            </div>
                            
                            <button 
                              className={`p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 ${needsAdminApproval ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
