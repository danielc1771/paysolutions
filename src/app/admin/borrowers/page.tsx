'use client';

import { createClient } from '@/utils/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import { useEffect, useState, useCallback } from 'react';
import { RoleRedirect } from '@/components/auth/RoleRedirect';

interface Borrower {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  ssn: string;
  annual_income: string;
  employment_status: string;
  employer_name: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  kyc_status: string;
  kyc_verified_at: string;
  created_at: string;
  updated_at: string;
  organization?: {
    id: string;
    name: string;
  };
  loans?: Array<{
    id: string;
    loan_number: string;
    principal_amount: string;
    status: string;
    vehicle_vin: string;
  }>;
}

interface Organization {
  id: string;
  name: string;
}

export default function BorrowersPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    borrowerId: string;
    borrowerName: string;
  }>({
    isOpen: false,
    borrowerId: '',
    borrowerName: ''
  });

  const supabase = createClient();

  const fetchBorrowers = useCallback(async () => {
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

      // Fetch borrowers with organization data
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
            status,
            vehicle_vin
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        setError(error.message);
        console.error('Error fetching borrowers:', error);
      } else {
        setBorrowers(data || []);
      }
    } catch (err) {
      setError('Failed to fetch borrowers');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchBorrowers();
  }, [fetchBorrowers]);

  const getKycStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getKycStatusText = (status: string) => {
    return status === 'verified' ? 'Verified' : 'Not Verified';
  };


  const handleDeleteBorrower = async (borrowerId: string) => {
    try {
      const response = await fetch(`/api/borrowers/${borrowerId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        alert('Borrower deleted successfully');
        // Refresh the borrowers list
        fetchBorrowers();
      } else {
        alert('Error deleting borrower: ' + (result.details || result.error));
      }
    } catch {
      alert('Failed to delete borrower');
    } finally {
      setDeleteConfirm({ isOpen: false, borrowerId: '', borrowerName: '' });
    }
  };

  const openDeleteConfirm = (borrowerId: string, borrowerName: string) => {
    setDeleteConfirm({
      isOpen: true,
      borrowerId,
      borrowerName
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, borrowerId: '', borrowerName: '' });
  };

  // Filter borrowers based on selected organization
  const filteredBorrowers = selectedOrganization === 'all' 
    ? borrowers 
    : borrowers.filter(b => b.organization?.id === selectedOrganization);

  // Calculate stats based on filtered data
  const totalBorrowers = filteredBorrowers?.length || 0;
  const verifiedBorrowers = filteredBorrowers?.filter(b => b.kyc_status === 'verified').length || 0;
  const pendingBorrowers = filteredBorrowers?.filter(b => b.kyc_status === 'pending').length || 0;
  const borrowersWithLoans = filteredBorrowers?.filter(b => b.loans && b.loans.length > 0).length || 0;

  return (
    <RoleRedirect allowedRoles={['admin']}>
      <AdminLayout>
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
                Borrower Management
              </h1>
              <p className="text-gray-600 text-lg">Comprehensive borrower database and KYC management</p>
            </div>
            <div>
              <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-3 rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Organization Filter */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Filter by Organization</h3>
              <p className="text-gray-600 text-sm">View borrowers from specific organizations</p>
            </div>
            <div className="w-72">
              <select
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border-0 bg-white/80 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm text-gray-900"
              >
                <option value="all">All Organizations</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-800">{totalBorrowers}</p>
              </div>
            </div>
            <h3 className="text-gray-700 font-semibold text-lg">Total Borrowers</h3>
            <p className="text-gray-500 text-sm mt-1">All registered users</p>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-800">{verifiedBorrowers}</p>
              </div>
            </div>
            <h3 className="text-gray-700 font-semibold text-lg">Verified KYC</h3>
            <p className="text-gray-500 text-sm mt-1">Completed verification</p>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-800">{pendingBorrowers}</p>
              </div>
            </div>
            <h3 className="text-gray-700 font-semibold text-lg">Pending KYC</h3>
            <p className="text-gray-500 text-sm mt-1">Needs verification</p>
          </div>

          <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-800">{borrowersWithLoans}</p>
              </div>
            </div>
            <h3 className="text-gray-700 font-semibold text-lg">With Loans</h3>
            <p className="text-gray-500 text-sm mt-1">Has loan history</p>
          </div>
        </div>

        {/* Borrowers Table */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">All Borrowers</h2>
                <p className="text-gray-600">Complete borrower database with KYC status and loan history</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 font-medium bg-white/60 px-4 py-2 rounded-2xl">
                  {totalBorrowers} borrowers
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
          ) : !filteredBorrowers || filteredBorrowers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">No borrowers yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">Borrowers will appear here once they complete the registration process and apply for loans.</p>
            </div>
          ) : (
            <div className="p-6">
              <div className="space-y-4">
                {filteredBorrowers.map((borrower: Borrower) => {
                  const loanCount = borrower.loans?.length || 0;
                  
                  return (
                    <div 
                      key={borrower.id} 
                      className="group relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-white/30"
                      onClick={() => window.location.href = `/admin/borrowers/${borrower.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <div className="flex-shrink-0">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                              <span className="text-white font-bold text-lg">
                                {borrower.first_name?.[0]}{borrower.last_name?.[0]}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-bold text-gray-900 truncate">
                                {borrower.first_name} {borrower.last_name}
                              </h3>
                              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getKycStatusColor(borrower.kyc_status)}`}>
                                {getKycStatusText(borrower.kyc_status)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-6 text-sm text-gray-600">
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {borrower.email}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {borrower.phone || 'No phone'}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2h-2a2 2 0 00-2 2z" />
                                </svg>
                                {borrower.employment_status?.replace('_', ' ') || 'N/A'}
                              </span>
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                {borrower.organization?.name || 'No Organization'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-8">
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {loanCount} {loanCount === 1 ? 'Loan' : 'Loans'}
                            </p>
                            <p className="text-sm text-gray-500 font-medium">
                              VIN: {borrower.loans?.[0]?.vehicle_vin || 'N/A'}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <button 
                              className="p-3 bg-blue-100 text-blue-600 rounded-2xl transition-all duration-300 group-hover:scale-110 hover:bg-blue-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.href = `/admin/borrowers/${borrower.id}`;
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
                                openDeleteConfirm(borrower.id, `${borrower.first_name} ${borrower.last_name}`);
                              }}
                              title="Delete Borrower"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
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
              <p className="text-gray-600">Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirm.borrowerName}</span>? This action cannot be undone and will also delete all associated loans.</p>
            </div>
            <div className="flex space-x-3">
              <button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-2xl transition-colors"
                onClick={() => handleDeleteBorrower(deleteConfirm.borrowerId)}
              >
                Delete Borrower
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