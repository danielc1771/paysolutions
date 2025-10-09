'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import CustomSelect from '@/components/CustomSelect';
import { LoanListItem, AdminLoanListItem } from '@/types/loan';
import { Plus, Search, Check, FileText, Trash2 } from 'lucide-react';
import { useUserProfile } from '@/components/auth/RoleRedirect';
import { LoanCard } from '@/components/LoanCard';

interface Organization {
  id: string;
  name: string;
}

export default function UserLoans() {
  const [loans, setLoans] = useState<(LoanListItem | AdminLoanListItem)[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [signingLoans, setSigningLoans] = useState<Set<string>>(new Set());
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
  const { profile } = useUserProfile();
  const isAdmin = profile?.role === 'admin';

  const supabase = useMemo(() => createClient(), []);

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

        if (isAdmin) {
          // Admin: Fetch all loans and organizations
          const { data: orgsData, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name')
            .order('name', { ascending: true });

          if (orgsError) {
            console.error('Error fetching organizations:', orgsError);
          } else {
            setOrganizations(orgsData || []);
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
              ),
              organization:organizations(
                id,
                name
              )
            `)
            .order('created_at', { ascending: false });

          if (error) {
            setError(error.message);
            console.error('Error fetching loans:', error);
          } else {
            setLoans(data || []);
          }
        } else {
          // Organization users: Fetch org-scoped loans
          const { data: userProfile, error: profileError } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

          if (profileError || !userProfile?.organization_id) {
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
            .eq('organization_id', userProfile.organization_id)
            .order('created_at', { ascending: false });

          if (error) {
            setError(error.message);
            console.error('Error fetching loans:', error);
          } else {
            setLoans(data || []);
          }
        }
      } catch (err) {
        setError('Failed to fetch loans');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      fetchLoans();
    }
  }, [supabase, isAdmin, profile]);

  // Filter loans based on status, organization, and search term
  const filteredLoans = loans.filter(loan => {
    let matchesStatus = false;
    
    if (filterStatus === 'all') {
      matchesStatus = true;
    } else if (filterStatus === 'action_required') {
      // Action required: application completed, needs organization signing, or fully signed ready for funding
      matchesStatus = loan.status === 'application_completed' || 
                     loan.status === 'ipay_approved' ||
                     loan.status === 'fully_signed';
    } else {
      matchesStatus = loan.status === filterStatus;
    }
    
    const matchesOrganization = selectedOrganization === 'all' || 
      ('organization' in loan && loan.organization?.id === selectedOrganization);
    
    const matchesSearch = searchTerm === '' || 
      loan.loan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.borrower?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.borrower?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesOrganization && matchesSearch;
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

  const handleSignDocuSign = async (loanId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setSigningLoans(prev => new Set(prev).add(loanId));
    
    try {
      console.log('🔗 Getting DocuSign signing URL for organization owner...');
      
      const response = await fetch('/api/docusign/signing-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          loanId,
          signerType: 'organization'
        }),
      });

      const data = await response.json();
      
      if (data.success && data.signingUrl) {
        console.log('✅ Got signing URL, redirecting...');
        // Redirect to DocuSign for signing
        window.location.href = data.signingUrl;
      } else {
        console.error('❌ Failed to get signing URL:', data.error);
        alert('Failed to get DocuSign signing URL: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error getting DocuSign signing URL:', error);
      alert('Failed to get DocuSign signing URL');
    } finally {
      setSigningLoans(prev => {
        const newSet = new Set(prev);
        newSet.delete(loanId);
        return newSet;
      });
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Loans' },
    { value: 'action_required', label: '🚨 Action Required' },
    { value: 'new', label: 'New' },
    { value: 'application_sent', label: 'Application Sent' },
    { value: 'application_completed', label: 'Application Completed' },
    { value: 'ipay_approved', label: 'iPay Approved' },
    { value: 'dealer_approved', label: 'Dealer Approved' },
    { value: 'fully_signed', label: 'Fully Signed' },
    { value: 'review', label: 'Under Review' },
    { value: 'funded', label: 'Funded' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
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
                  <Plus className="w-5 h-5" />
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
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>
                {isAdmin && (
                  <div className="w-full sm:w-64">
                    <CustomSelect
                      options={[
                        { value: 'all', label: 'All Organizations' },
                        ...organizations.map(org => ({ value: org.id, label: org.name }))
                      ]}
                      value={selectedOrganization}
                      onChange={setSelectedOrganization}
                      placeholder="Filter by organization"
                    />
                  </div>
                )}
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
                    <FileText className="w-10 h-10 text-green-500" />
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
                      <Plus className="w-5 h-5" />
                      <span>Create Your First Loan</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="p-6">
                  <div className="space-y-4">
                    {filteredLoans.map((loan) => (
                      <LoanCard
                        key={loan.id}
                        loan={loan}
                        isAdmin={isAdmin}
                        onSignDocuSign={handleSignDocuSign}
                        signingLoans={signingLoans}
                        onDelete={openDeleteConfirm}
                        showActions={true}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-96 border border-white/20">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-96 border border-white/20">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
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
    </div>
  );
}