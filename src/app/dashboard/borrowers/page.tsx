'use client';

import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import React, { useEffect, useState, useMemo } from 'react';
import CustomSelect from '@/components/CustomSelect';
import { useUserProfile } from '@/components/auth/RoleRedirect';
import DataTable, { Column, Action } from '@/components/ui/DataTable';
import { Eye, Trash2, Mail, Phone, Calendar } from 'lucide-react';
import { toProperCase, formatStatus } from '@/utils/textFormatters';

interface Borrower {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  kyc_status: string;
  created_at: string;
  organization?: {
    id: string;
    name: string;
  };
  loans: Array<{
    id: string;
    loan_number: string;
    principal_amount: string;
    status: string;
  }>;
}

interface Organization {
  id: string;
  name: string;
}

export default function UserBorrowers() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKyc, setFilterKyc] = useState<string>('all');
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    borrowerId: string;
    borrowerName: string;
    loanCount: number;
    activeLoans: number;
  }>({
    isOpen: false,
    borrowerId: '',
    borrowerName: '',
    loanCount: 0,
    activeLoans: 0
  });
  const { profile } = useUserProfile();
  const isAdmin = profile?.role === 'admin';

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchBorrowers = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        if (isAdmin) {
          // Admin: Fetch all borrowers and organizations
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
            .from('borrowers')
            .select(`
              *,
              organization:organizations(
                id,
                name
              ),
              loans(
                id,
                loan_number,
                principal_amount,
                status
              )
            `)
            .order('created_at', { ascending: false });

          if (error) {
            setError(error.message);
            console.error('Error fetching borrowers:', error);
          } else {
            setBorrowers(data || []);
          }
        } else {
          // Organization users: Fetch org-scoped borrowers
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
            .from('borrowers')
            .select(`
              *,
              loans(
                id,
                loan_number,
                principal_amount,
                status
              )
            `)
            .eq('organization_id', userProfile.organization_id)
            .order('created_at', { ascending: false });

          if (error) {
            setError(error.message);
            console.error('Error fetching borrowers:', error);
          } else {
            setBorrowers(data || []);
          }
        }
      } catch (err) {
        setError('Failed to fetch borrowers');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      fetchBorrowers();
    }
  }, [supabase, isAdmin, profile]);

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
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

  const handleDeleteBorrower = async (borrowerId: string) => {
    try {
      const response = await fetch(`/api/borrowers/${borrowerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        alert('Error deleting borrower: ' + result.error);
        return;
      }

      setSuccessMessage(`Borrower deleted successfully`);
      setShowSuccessModal(true);
      
      // Refresh the borrowers list
      const updatedBorrowers = borrowers.filter(borrower => borrower.id !== borrowerId);
      setBorrowers(updatedBorrowers);
    } catch (error) {
      console.error('Error deleting borrower:', error);
      alert('Failed to delete borrower');
    } finally {
      setDeleteConfirm({
        isOpen: false,
        borrowerId: '',
        borrowerName: '',
        loanCount: 0,
        activeLoans: 0
      });
    }
  };

  const openDeleteConfirm = (borrowerId: string, borrowerName: string, loans: Array<{status: string}>) => {
    const loanCount = loans.length;
    const activeLoans = loans.filter(loan => loan.status === 'active' || loan.status === 'funded').length;
    
    setDeleteConfirm({
      isOpen: true,
      borrowerId,
      borrowerName,
      loanCount,
      activeLoans
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({
      isOpen: false,
      borrowerId: '',
      borrowerName: '',
      loanCount: 0,
      activeLoans: 0
    });
  };

  // Filter borrowers based on search term, KYC status, and organization
  const filteredBorrowers = borrowers.filter(borrower => {
    const matchesSearch = searchTerm === '' || 
      borrower.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      borrower.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      borrower.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      borrower.phone?.includes(searchTerm);
    
    const matchesKyc = filterKyc === 'all' || borrower.kyc_status === filterKyc;
    
    const matchesOrganization = selectedOrganization === 'all' || 
      borrower.organization?.id === selectedOrganization;
    
    return matchesSearch && matchesKyc && matchesOrganization;
  });

  const kycOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'expired', label: 'Expired' },
  ];

  const columns: Column<Borrower>[] = [
    {
      key: 'borrower',
      label: 'Borrower',
      render: (borrower) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">
              {borrower.first_name?.[0]}{borrower.last_name?.[0]}
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {toProperCase(borrower.first_name)} {toProperCase(borrower.last_name)}
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getKycStatusColor(borrower.kyc_status)}`}>
              KYC: {formatStatus(borrower.kyc_status)}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (borrower) => (
        <div className="space-y-1">
          {borrower.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="w-3 h-3 mr-1 text-blue-500" />
              {borrower.email.toLowerCase()}
            </div>
          )}
          {borrower.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="w-3 h-3 mr-1 text-green-500" />
              {borrower.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'organization',
      label: 'Organization',
      render: (borrower) => (
        <div className="text-sm text-gray-900">
          {toProperCase(borrower.organization?.name || 'N/A')}
        </div>
      ),
      show: () => isAdmin,
    },
    {
      key: 'loans',
      label: 'Loans',
      render: (borrower) => (
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">
            {borrower.loans?.length || 0}
          </p>
          <p className="text-xs text-gray-500">
            {borrower.loans?.length === 1 ? 'Loan' : 'Loans'}
          </p>
        </div>
      ),
    },
    {
      key: 'created',
      label: 'Joined',
      render: (borrower) => (
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          {formatDate(borrower.created_at)}
        </div>
      ),
    },
  ];

  const actions: Action<Borrower>[] = [
    {
      icon: Eye,
      label: 'View Details',
      onClick: (borrower) => {
        window.location.href = `/dashboard/borrowers/${borrower.id}`;
      },
      color: 'blue',
    },
    {
      icon: Trash2,
      label: 'Delete Borrower',
      onClick: (borrower) => {
        openDeleteConfirm(borrower.id, `${borrower.first_name} ${borrower.last_name}`, borrower.loans || []);
      },
      color: 'red',
    },
  ];

  // Filter out organization column if not admin
  const visibleColumns = columns.filter(col => {
    if ('show' in col && col.show) {
      return col.show();
    }
    return true;
  });

  return (
    <div className={`min-h-screen ${isAdmin ? 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100' : 'bg-gradient-to-br from-green-50 via-blue-50 to-teal-100'}`}>
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-3">
                    Borrower Management
                  </h1>
                  <p className="text-gray-600 text-lg">{isAdmin ? 'Manage all borrowers across all organizations' : 'Manage all borrowers for your organization'}</p>
                </div>
                {!isAdmin && (
                  <Link
                    href="/dashboard/loans/create"
                    className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-8 py-4 rounded-2xl font-bold hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create New Loan</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 mb-8 shadow-lg border border-white/20">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search borrowers by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border-0 bg-white/60 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-green-500 focus:outline-none text-sm text-gray-900 placeholder-gray-500"
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
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
                    options={kycOptions}
                    value={filterKyc}
                    onChange={(value) => setFilterKyc(value)}
                    placeholder="Filter by KYC status"
                    className="w-full px-4 py-3 rounded-2xl border-0 bg-white/60 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-green-500 focus:outline-none text-sm text-gray-900 transition-all duration-300 flex items-center justify-between"
                  />
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Borrowers</p>
                    <p className="text-3xl font-bold text-gray-900">{borrowers.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-2xl">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">KYC Completed</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {borrowers.filter(b => b.kyc_status === 'completed').length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-2xl">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">KYC Pending</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {borrowers.filter(b => b.kyc_status === 'pending').length}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-2xl">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Loans</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {borrowers.reduce((count, borrower) => count + (borrower.loans?.length || 0), 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-2xl">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Borrowers List */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
              <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">All Borrowers</h2>
                    <p className="text-gray-600">
                      {filteredBorrowers.length} of {borrowers.length} borrowers
                      {filterKyc !== 'all' && ` • Filtered by KYC: ${kycOptions.find(s => s.value === filterKyc)?.label}`}
                    </p>
                  </div>
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
                  <p className="mt-4 text-gray-600 font-medium">Loading borrowers...</p>
                </div>
              ) : error ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load borrowers</h3>
                  <p className="text-red-600 mb-4">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-red-500 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-red-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <DataTable
                  data={filteredBorrowers}
                  columns={visibleColumns}
                  actions={actions}
                  loading={loading}
                  error={error}
                  emptyState={{
                    icon: (
                      <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    ),
                    title: searchTerm || filterKyc !== 'all' ? 'No borrowers match your criteria' : 'No borrowers yet',
                    description: searchTerm || filterKyc !== 'all' 
                      ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                      : isAdmin
                        ? 'Borrowers from all organizations will appear here.'
                        : 'Borrowers will appear here once you create loan applications for customers.',
                    action: (!searchTerm && filterKyc === 'all' && !isAdmin) ? (
                      <Link
                        href="/dashboard/loans/create"
                        className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-bold hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span>Create Your First Loan</span>
                      </Link>
                    ) : undefined,
                  }}
                  getItemKey={(borrower) => borrower.id}
                />
              )}
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
                <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Borrower Confirmation</h2>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirm.borrowerName}</span>?
                </p>
                
                {deleteConfirm.loanCount > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div className="text-left">
                        <p className="text-orange-800 font-semibold text-sm">
                          Warning: This borrower has {deleteConfirm.loanCount} loan{deleteConfirm.loanCount !== 1 ? 's' : ''}
                        </p>
                        <p className="text-orange-700 text-sm">
                          {deleteConfirm.activeLoans > 0 
                            ? `${deleteConfirm.activeLoans} active loan${deleteConfirm.activeLoans !== 1 ? 's' : ''} will be deleted. This action cannot be undone.`
                            : 'All associated loans will be permanently deleted.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <p className="text-sm text-red-600 mt-2">This action cannot be undone and will permanently remove the borrower and all associated loans from the system.</p>
              </div>
              
              <div className="flex space-x-3">
                {deleteConfirm.activeLoans > 0 ? (
                  <button
                    className="flex-1 bg-gray-200 text-gray-900 font-semibold py-3 px-6 rounded-2xl transition-colors cursor-not-allowed opacity-50"
                    disabled
                    title="Cannot delete borrower with active loans"
                  >
                    Cannot Delete
                  </button>
                ) : (
                  <button
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-2xl transition-colors"
                    onClick={() => handleDeleteBorrower(deleteConfirm.borrowerId)}
                  >
                    Delete Borrower
                  </button>
                )}
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