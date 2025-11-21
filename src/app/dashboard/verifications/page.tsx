'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import CustomSelect from '@/components/CustomSelect';
import { VerificationListItem, AdminVerificationListItem } from '@/types/verification';
import { Plus, Search, Check, ShieldCheck, Trash2, Eye, Mail, Copy, Calendar } from 'lucide-react';
import { useUserProfile } from '@/components/auth/RoleRedirect';
import DataTable, { Column, Action } from '@/components/ui/DataTable';
import VerificationStatusBadge from '@/components/verifications/VerificationStatusBadge';
import { toProperCase } from '@/utils/textFormatters';

interface Organization {
  id: string;
  name: string;
}

export default function VerificationsPage() {
  const [verifications, setVerifications] = useState<(VerificationListItem | AdminVerificationListItem)[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    verificationId: string;
    personName: string;
  }>({
    isOpen: false,
    verificationId: '',
    personName: ''
  });
  const { profile } = useUserProfile();
  const isAdmin = profile?.role === 'admin';

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchVerifications = async () => {
      try {
        setLoading(true);

        // Fetch verifications from API route
        const response = await fetch('/api/verifications');
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to fetch verifications');
          return;
        }

        setVerifications(data.verifications || []);

        // If admin, also fetch organizations for filter dropdown
        if (isAdmin) {
          const { data: orgsData, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name')
            .order('name', { ascending: true });

          if (!orgsError && orgsData) {
            setOrganizations(orgsData);
          }
        }
      } catch (err) {
        setError('Failed to fetch verifications');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      fetchVerifications();
    }
  }, [supabase, isAdmin, profile]);

  // Filter verifications
  const filteredVerifications = useMemo(() => {
    return verifications.filter(verification => {
      const matchesStatus = statusFilter === 'all' || verification.status === statusFilter;

      const matchesOrganization = selectedOrganization === 'all' ||
        ('organization' in verification && verification.organization?.id === selectedOrganization);

      const matchesSearch = searchTerm === '' ||
        verification.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        verification.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        verification.email.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesOrganization && matchesSearch;
    });
  }, [verifications, statusFilter, selectedOrganization, searchTerm]);

  const handleDeleteVerification = async (verificationId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Session expired. Please log in again.');
        return;
      }

      const response = await fetch(`/api/verifications/${verificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert('Error deleting verification: ' + (data.error || 'Unknown error'));
        return;
      }

      setSuccessMessage('Verification deleted successfully');
      setShowSuccessModal(true);

      // Remove from local state
      setVerifications(prev => prev.filter(v => v.id !== verificationId));
    } catch (error) {
      console.error('Error deleting verification:', error);
      alert('Failed to delete verification');
    } finally {
      setDeleteConfirm({ isOpen: false, verificationId: '', personName: '' });
    }
  };

  const handleCopyLink = () => {
    // This will be implemented once we have the token
    // For now, show placeholder
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(`${baseUrl}/verify/[token]`);
    setSuccessMessage('Link copied to clipboard');
    setShowSuccessModal(true);
  };

  const handleResendEmail = async (verificationId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Session expired. Please log in again.');
        return;
      }

      const response = await fetch(`/api/verifications/${verificationId}/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        alert('Error resending email: ' + (data.error || 'Unknown error'));
        return;
      }

      setSuccessMessage('Verification email resent successfully');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error resending email:', error);
      alert('Failed to resend email');
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'email_sent', label: 'Email Sent' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'identity_verified', label: 'Identity Verified' },
    { value: 'phone_verified', label: 'Phone Verified' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'expired', label: 'Expired' },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const columns: Column<VerificationListItem | AdminVerificationListItem>[] = [
    {
      key: 'person',
      label: 'Person',
      render: (verification) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">
              {verification.first_name[0]}{verification.last_name[0]}
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {toProperCase(verification.first_name)} {toProperCase(verification.last_name)}
            </div>
            <div className="text-xs text-gray-500">{verification.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (verification) => (
        <VerificationStatusBadge
          status={verification.status}
          stripeStatus={verification.stripe_verification_status}
          phoneStatus={verification.phone_verification_status}
          size="sm"
        />
      ),
    },
    {
      key: 'organization',
      label: 'Organization',
      render: (verification) => (
        <div className="text-sm text-gray-900">
          {toProperCase(('organization' in verification && verification.organization?.name) || 'N/A')}
        </div>
      ),
      show: () => isAdmin,
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (verification) => (
        <div className="text-sm text-gray-600">
          {verification.phone || 'N/A'}
        </div>
      ),
    },
    {
      key: 'created',
      label: 'Created',
      render: (verification) => (
        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          {formatDate(verification.created_at)}
        </div>
      ),
    },
  ];

  const actions: Action<VerificationListItem | AdminVerificationListItem>[] = [
    {
      icon: Eye,
      label: 'View Details',
      onClick: (verification) => {
        window.location.href = `/dashboard/verifications/${verification.id}`;
      },
      color: 'blue',
    },
    {
      icon: Mail,
      label: 'Resend Email',
      onClick: (verification) => {
        handleResendEmail(verification.id);
      },
      color: 'green',
      show: (verification) => verification.status !== 'completed',
    },
    {
      icon: Copy,
      label: 'Copy Link',
      onClick: () => {
        handleCopyLink();
      },
      color: 'blue',
    },
    {
      icon: Trash2,
      label: 'Delete',
      onClick: (verification) => {
        setDeleteConfirm({
          isOpen: true,
          verificationId: verification.id,
          personName: `${verification.first_name} ${verification.last_name}`,
        });
      },
      color: 'red',
      show: (verification) => verification.status !== 'completed',
    },
  ];

  const visibleColumns = columns.filter(col => {
    if ('show' in col && col.show) {
      return col.show();
    }
    return true;
  });

  return (
    <div className={`min-h-screen ${isAdmin ? 'bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100' : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-100'}`}>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3">
                Identity Verifications
              </h1>
              <p className="text-gray-600 text-lg">Manage customer identity verification requests</p>
            </div>
            {profile !== null && (
              <Link
                href="/dashboard/verifications/create"
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-2xl font-bold hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Create Verification</span>
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
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border-0 bg-white/60 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-gray-900 placeholder-gray-500"
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
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </div>

        {/* Verifications List */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
          <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  All Verifications
                </h2>
                <p className="text-gray-600">
                  {filteredVerifications.length} of {verifications.length} verifications
                  {statusFilter !== 'all' && ` • Filtered by: ${statusOptions.find(s => s.value === statusFilter)?.label}`}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-500 mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading verifications...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load verifications</h3>
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
              data={filteredVerifications}
              columns={visibleColumns}
              actions={actions}
              loading={loading}
              error={error}
              emptyState={{
                icon: <ShieldCheck className="w-10 h-10 text-blue-500" />,
                title: searchTerm || statusFilter !== 'all' ? 'No verifications match your criteria' : 'No verifications yet',
                description: searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                  : 'Get started by creating your first identity verification request.',
                action: (!searchTerm && statusFilter === 'all') ? (
                  <Link
                    href="/dashboard/verifications/create"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-bold hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Create Your First Verification</span>
                  </Link>
                ) : undefined,
              }}
              getItemKey={(verification) => verification.id}
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
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600 mb-6">{successMessage}</p>
              <button
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 px-6 rounded-2xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300"
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
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Verification</h2>
              <p className="text-gray-600">
                Are you sure you want to delete the verification for <span className="font-semibold text-gray-900">{deleteConfirm.personName}</span>?
              </p>
              <p className="text-sm text-red-600 mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex space-x-3">
              <button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-2xl transition-colors"
                onClick={() => handleDeleteVerification(deleteConfirm.verificationId)}
              >
                Delete
              </button>
              <button
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-2xl transition-colors"
                onClick={() => setDeleteConfirm({ isOpen: false, verificationId: '', personName: '' })}
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
