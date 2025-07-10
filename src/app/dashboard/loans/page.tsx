'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import UserLayout from '@/components/UserLayout';
import Link from 'next/link';
import { RoleRedirect } from '@/components/auth/RoleRedirect';
import CustomSelect from '@/components/CustomSelect';

interface Loan {
  id: string;
  loan_number: string;
  principal_amount: string;
  interest_rate: string;
  term_weeks: number;
  weekly_payment: string;
  status: string;
  borrower: {
    first_name: string;
    last_name: string;
    email: string;
    kyc_status: string;
  };
  docusign_status: string;
  created_at: string;
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
}

export default function UserLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    loanId: string;
    loanNumber: string;
    borrowerName: string;
  }>({
    isOpen: false,
    loanId: '',
    loanNumber: '',
    borrowerName: ''
  });

  const supabase = createClient();

  useEffect(() => {
    // Check for action_required filter from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter');
    if (filterParam === 'action_required') {
      setFilterStatus('action_required');
    }

    const fetchLoans = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.organization_id) {
          setError(profileError?.message || 'Could not retrieve organization ID for user.');
          setLoading(false);
          return;
        }

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
          .eq('organization_id', profile.organization_id)
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
  }, [supabase]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'application_sent': return 'bg-yellow-100 text-yellow-800';
      case 'application_completed': return 'bg-orange-100 text-orange-800';
      case 'review': return 'bg-orange-100 text-orange-800';
      case 'signed': return 'bg-emerald-100 text-emerald-800';
      case 'funded': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
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

  const formatStatus = (status: string) => {
    switch (status) {
      case 'new': return 'New';
      case 'application_sent': return 'Application Sent';
      case 'application_completed': return 'Application Completed';
      case 'review': return 'Under Review';
      case 'signed': return 'Signed - Ready for Funding';
      case 'funded': return 'Funded';
      case 'active': return 'Active';
      case 'closed': return 'Closed';
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  // Filter loans based on status and search term
  const filteredLoans = loans.filter(loan => {
    let matchesStatus = false;
    
    if (filterStatus === 'all') {
      matchesStatus = true;
    } else if (filterStatus === 'action_required') {
      // Action required: application completed or signed ready for funding
      matchesStatus = loan.status === 'application_completed' || 
                     (loan.docusign_status === 'signed' && loan.status !== 'funded');
    } else {
      matchesStatus = loan.status === filterStatus;
    }
    
    const matchesSearch = searchTerm === '' || 
      loan.loan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.borrower?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.borrower?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  // Add success modal trigger function
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
  };

  // Make the success function available globally for other components
  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).showLoanSuccessMessage = showSuccessMessage;
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).showLoanSuccessMessage;
    };
  }, []);

  const handleDeleteLoan = async (loanId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('User not authenticated');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.organization_id) {
        alert('Could not retrieve organization ID for user.');
        return;
      }

      // Delete loan only if it belongs to the user's organization
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanId)
        .eq('organization_id', profile.organization_id);

      if (error) {
        alert('Error deleting loan: ' + error.message);
      } else {
        setSuccessMessage('Loan deleted successfully');
        setShowSuccessModal(true);
        // Refresh the loans list
        const updatedLoans = loans.filter(loan => loan.id !== loanId);
        setLoans(updatedLoans);
      }
    } catch {
      alert('Failed to delete loan');
    } finally {
      setDeleteConfirm({ isOpen: false, loanId: '', loanNumber: '', borrowerName: '' });
    }
  };

  const openDeleteConfirm = (loanId: string, loanNumber: string, borrowerName: string) => {
    setDeleteConfirm({
      isOpen: true,
      loanId,
      loanNumber,
      borrowerName
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, loanId: '', loanNumber: '', borrowerName: '' });
  };

  const statusOptions = [
    { value: 'all', label: 'All Loans' },
    { value: 'action_required', label: '🚨 Action Required' },
    { value: 'new', label: 'New' },
    { value: 'application_sent', label: 'Application Sent' },
    { value: 'application_completed', label: 'Application Completed' },
    { value: 'review', label: 'Under Review' },
    { value: 'signed', label: 'Signed' },
    { value: 'funded', label: 'Funded' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <RoleRedirect allowedRoles={['user']}>
      <UserLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-3">
                    Loan Management
                  </h1>
                  <p className="text-gray-600 text-lg">Manage all loans for your organization</p>
                </div>
                <Link
                  href="/dashboard/loans/create"
                  className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-8 py-4 rounded-2xl font-bold hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Create New Loan</span>
                </Link>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 mb-8 shadow-lg border border-white/20">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search loans by number or borrower name..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border-0 bg-white/60 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-green-500 focus:outline-none text-sm text-gray-900 placeholder-gray-500"
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div className="w-full sm:w-64">
                  <CustomSelect
                    options={statusOptions}
                    value={filterStatus}
                    onChange={setFilterStatus}
                    placeholder="Filter by status"
                  />
                </div>
              </div>
            </div>

            {/* Loans List */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
              <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {filterStatus === 'action_required' ? '🚨 Loans Requiring Action' : 'All Loans'}
                    </h2>
                    <p className="text-gray-600">
                      {filteredLoans.length} of {loans.length} loans
                      {filterStatus !== 'all' && ` • Filtered by: ${statusOptions.find(s => s.value === filterStatus)?.label?.replace('🚨 ', '')}`}
                    </p>
                  </div>
                  {filterStatus === 'action_required' && filteredLoans.length > 0 && (
                    <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-semibold border border-orange-300">
                      Take action on these loans
                    </div>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-600 font-medium">Loading loans...</p>
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
              ) : filteredLoans.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {searchTerm || filterStatus !== 'all' ? 'No loans match your criteria' : 'No loans yet'}
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                      : 'Get started by creating your first loan application for a customer.'
                    }
                  </p>
                  {(!searchTerm && filterStatus === 'all') && (
                    <Link
                      href="/dashboard/loans/create"
                      className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-bold hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Create Your First Loan</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="p-6">
                  <div className="space-y-4">
                    {filteredLoans.map((loan) => {
                      const needsAction = loan.docusign_status === 'signed' && loan.status !== 'funded';
                      
                      return (
                        <Link
                          key={loan.id}
                          href={`/dashboard/loans/${loan.id}`}
                          className={`group relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-white/30 block ${needsAction ? 'ring-2 ring-orange-400 bg-orange-50/70' : ''}`}
                        >
                          {needsAction && (
                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
                              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-6">
                              <div className="flex-shrink-0">
                                <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
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
                                    {formatStatus(loan.status)}
                                  </span>
                                  {needsAction && (
                                    <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-300">
                                      🚨 Action Required
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {loan.loan_number}
                                  </span>
                                  <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {formatDate(loan.created_at)}
                                  </span>
                                  {loan.vehicle_make && (
                                    <span className="flex items-center">
                                      <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                      </svg>
                                      {loan.vehicle_year} {loan.vehicle_make} {loan.vehicle_model}
                                    </span>
                                  )}
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
                              
                              <div className="flex items-center space-x-2">
                                {needsAction && (
                                  <>
                                    {loan.status === 'application_completed' && (
                                      <button 
                                        className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-green-200 hover:scale-105"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          window.location.href = `/dashboard/loans/${loan.id}?action=review`;
                                        }}
                                        title="Review Application"
                                      >
                                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Review
                                      </button>
                                    )}
                                    {loan.docusign_status === 'signed' && loan.status !== 'funded' && (
                                      <button 
                                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-blue-200 hover:scale-105"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          window.location.href = `/dashboard/loans/${loan.id}?action=fund`;
                                        }}
                                        title="Fund Loan"
                                      >
                                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                        </svg>
                                        Fund
                                      </button>
                                    )}
                                  </>
                                )}
                                
                                <button 
                                  className="p-3 bg-blue-100 text-blue-600 rounded-2xl transition-all duration-300 group-hover:scale-110 hover:bg-blue-200"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    window.location.href = `/dashboard/loans/${loan.id}`;
                                  }}
                                  title="View Details"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                
                                <button 
                                  className="p-3 bg-red-100 text-red-600 rounded-2xl transition-all duration-300 group-hover:scale-110 hover:bg-red-200"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openDeleteConfirm(loan.id, loan.loan_number, `${loan.borrower?.first_name} ${loan.borrower?.last_name}`);
                                  }}
                                  title="Delete Loan"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-96 border border-white/20">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Success!</h2>
                <p className="text-gray-600 mb-6">{successMessage}</p>
                <button
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold py-3 px-6 rounded-2xl hover:from-green-600 hover:to-teal-600 transition-all duration-300"
                  onClick={() => setShowSuccessModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </UserLayout>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-96 border border-white/20">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Loan Confirmation</h2>
              <p className="text-gray-600">
                Are you sure you want to delete loan <span className="font-semibold text-gray-900">{deleteConfirm.loanNumber}</span> for <span className="font-semibold text-gray-900">{deleteConfirm.borrowerName}</span>?
              </p>
              <p className="text-sm text-red-600 mt-2">This action cannot be undone and will permanently remove the loan from the system.</p>
            </div>
            <div className="flex space-x-3">
              <button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-2xl transition-colors"
                onClick={() => handleDeleteLoan(deleteConfirm.loanId)}
              >
                Delete Loan
              </button>
              <button
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-2xl transition-colors"
                onClick={closeDeleteConfirm}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </RoleRedirect>
  );
}