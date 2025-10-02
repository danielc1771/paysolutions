'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { RoleRedirect } from '@/components/auth/RoleRedirect';
import { AdminLoanListItem } from '@/types/loan';
import CustomSelect from '@/components/CustomSelect';
import { formatLoanStatus } from '@/utils/formatters';

interface Organization {
  id: string;
  name: string;
}

export default function LoansPage() {
  const [loans, setLoans] = useState<AdminLoanListItem[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    loanId: string;
    loanNumber: string;
  }>({
    isOpen: false,
    loanId: '',
    loanNumber: ''
  });

  const supabase = createClient();

  useEffect(() => {
    fetchLoans();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      
      // Fetch organizations for the filter dropdown
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name', { ascending: true });

      if (orgsError) {
        console.error('Error fetching organizations:', orgsError);
      } else {
        setOrganizations(orgsData || []);
      }

      // Fetch loans with organization data
      const { data, error } = await supabase
        .from('loans')
        .select(`
          id,
          loan_number,
          principal_amount,
          interest_rate,
          term_weeks,
          weekly_payment,
          remaining_balance,
          status,
          purpose,
          created_at,
          borrower:borrowers(
            first_name,
            last_name,
            email,
            kyc_status
          ),
          organization:organizations(
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        // Transform the data to match our interface
        const transformedData = data?.map((loan: Record<string, unknown>) => ({
          ...loan,
          borrower: Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower,
          organization: Array.isArray(loan.organization) ? loan.organization[0] : loan.organization
        })) || [];
        setLoans(transformedData as AdminLoanListItem[]);
      }
    } catch {
      setError('Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLoan = async (loanId: string) => {
    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loanId);

      if (error) {
        alert('Error deleting loan: ' + error.message);
      } else {
        alert('Loan deleted successfully');
        // Refresh the loans list
        fetchLoans();
      }
    } catch {
      alert('Failed to delete loan');
    } finally {
      setDeleteConfirm({ isOpen: false, loanId: '', loanNumber: '' });
    }
  };

  const openDeleteConfirm = (loanId: string, loanNumber: string) => {
    setDeleteConfirm({
      isOpen: true,
      loanId,
      loanNumber
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, loanId: '', loanNumber: '' });
  };

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
      day: 'numeric',
    });
  };

  // Filter loans based on selected organization
  const filteredLoans = selectedOrganization === 'all' 
    ? loans 
    : loans.filter(l => l.organization?.id === selectedOrganization);

  return (
    <RoleRedirect allowedRoles={['admin']}>
      <AdminLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
            Loan Management
          </h1>
          <p className="text-gray-600 text-lg">Complete loan lifecycle management and tracking</p>
        </div>

        {/* Organization Filter */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Filter by Organization</h3>
              <p className="text-gray-600 text-sm">View loans from specific organizations</p>
            </div>
            <div className="w-72">
              <CustomSelect
                options={[
                  { value: 'all', label: 'All Organizations' },
                  ...organizations.map(org => ({ value: org.id, label: org.name }))
                ]}
                value={selectedOrganization}
                onChange={(value) => setSelectedOrganization(value)}
                placeholder="Select organization"
                className="w-full px-4 py-3 rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm text-gray-900 transition-all duration-300 flex items-center justify-between"
              />
            </div>
          </div>
        </div>

        {/* Loans Table */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">All Loans</h2>
                <p className="text-gray-600">Complete loan portfolio with application tracking</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 font-medium bg-white/60 px-4 py-2 rounded-2xl">
                  {filteredLoans.length} loans
                  {selectedOrganization !== 'all' && (
                    <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                      {organizations.find(org => org.id === selectedOrganization)?.name}
                    </span>
                  )}
                </span>
              </div>
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
          ) : !filteredLoans || filteredLoans.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No loans yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">Loans will appear here as organizations create loan applications through the system.</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {filteredLoans.map((loan: AdminLoanListItem) => (
                  <div 
                    key={loan.id} 
                    className="group relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-white/30"
                    onClick={() => window.location.href = `/admin/loans/${loan.id}`}
                  >
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
                              {formatLoanStatus(loan.status)}
                            </span>
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
                              {loan.purpose} Loan
                            </span>
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {(parseFloat(loan.interest_rate) * 100).toFixed(2)}% APR
                            </span>
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4M5 7h14l1 12H4L5 7z" />
                              </svg>
                              {loan.term_weeks} weeks
                            </span>
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {loan.organization?.name || 'No Organization'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-8">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            ${parseFloat(loan.principal_amount).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 font-medium">
                            Balance: ${parseFloat(loan.remaining_balance).toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-gray-500 font-medium">Created</p>
                          <p className="text-sm font-semibold text-gray-700">
                            {formatDate(loan.created_at)}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button 
                            className="p-3 bg-blue-100 text-blue-600 rounded-2xl transition-all duration-300 group-hover:scale-110 hover:bg-blue-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/admin/loans/${loan.id}`;
                            }}
                            title="View Details"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 616 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          
                          <button 
                            className="p-3 bg-red-100 text-red-600 rounded-2xl transition-all duration-300 group-hover:scale-110 hover:bg-red-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteConfirm(loan.id, loan.loan_number);
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
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
              <p className="text-gray-600">Are you sure you want to delete loan <span className="font-semibold text-gray-900">{deleteConfirm.loanNumber}</span>? This action cannot be undone.</p>
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
    </AdminLayout>
    </RoleRedirect>
  );
}
