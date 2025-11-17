'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Building2, Users, DollarSign, Edit, Trash2, Eye } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import AddOrganizationForm from '@/components/dashboard/AddOrganizationForm';
import DataTable, { Column, Action } from '@/components/ui/DataTable';
import { toProperCase, formatStatus } from '@/utils/textFormatters';

interface Organization {
  id: string;
  name: string;
  email: string;
  phone: string;
  contact_person: string;
  subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscription_start_date: string;
  subscription_end_date: string;
  monthly_loan_limit: number;
  total_users_limit: number;
  is_active: boolean;
  created_at: string;
  user_count?: number;
  loan_count?: number;
  borrower_count?: number;
}

export default function OrganizationsTable() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; org: Organization | null }>({ show: false, org: null });
  const [deleting, setDeleting] = useState(false);

  const supabase = createClient();

  const handleDelete = async (org: Organization) => {
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/organizations/${org.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete organization');
      }

      console.log('✅ Organization deleted:', result);
      
      // Close confirmation dialog
      setDeleteConfirm({ show: false, org: null });
      
      // Refresh organizations list
      await fetchOrganizations();

    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete organization');
    } finally {
      setDeleting(false);
    }
  };

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Fetch counts for each organization
      const organizationsWithCounts = await Promise.all(
        (orgs || []).map(async (org) => {
          // Get user count
          const { count: userCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Get loan count
          const { count: loanCount } = await supabase
            .from('loans')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Get borrower count
          const { count: borrowerCount } = await supabase
            .from('borrowers')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          return {
            ...org,
            user_count: userCount || 0,
            loan_count: loanCount || 0,
            borrower_count: borrowerCount || 0,
          };
        })
      );

      setOrganizations(organizationsWithCounts);
    } catch (err) {
      setError('Failed to fetch organizations.');
      console.error('Error fetching organizations:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter organizations based on search term and status
  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = searchTerm === '' || 
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.contact_person?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || org.subscription_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'trial', label: 'Trial' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const columns: Column<Organization>[] = [
    {
      key: 'organization',
      label: 'Organization',
      render: (org) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">{toProperCase(org.name)}</div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${org.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {org.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      ),
      mobileRender: (org) => (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{toProperCase(org.name)}</div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${org.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {org.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      label: 'Contact',
      render: (org) => (
        <div>
          <div className="text-sm text-gray-900">{toProperCase(org.contact_person || 'N/A')}</div>
          <div className="text-sm text-gray-500">{org.email.toLowerCase()}</div>
          <div className="text-sm text-gray-500">{org.phone}</div>
        </div>
      ),
      mobileRender: (org) => (
        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Contact:</span>
            <span className="text-gray-900 font-medium">{toProperCase(org.contact_person || 'N/A')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Email:</span>
            <span className="text-gray-900 text-xs">{org.email.toLowerCase()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Phone:</span>
            <span className="text-gray-900">{org.phone}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'subscription',
      label: 'Subscription',
      render: (org) => (
        <div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(org.subscription_status)}`}>
              {formatStatus(org.subscription_status)}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Ends: {formatDate(org.subscription_end_date)}
          </div>
        </div>
      ),
      mobileRender: (org) => (
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-gray-500 text-sm">Subscription:</span>
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(org.subscription_status)}`}>
            {formatStatus(org.subscription_status)}
          </span>
        </div>
      ),
    },
    {
      key: 'usage',
      label: 'Usage',
      render: (org) => (
        <div className="flex items-center space-x-4 text-sm text-gray-900">
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span>{org.user_count}/{org.total_users_limit}</span>
          </div>
          <div className="flex items-center space-x-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span>{org.loan_count}/{org.monthly_loan_limit}</span>
          </div>
          <div className="text-gray-500 text-xs">{org.borrower_count} borrowers</div>
        </div>
      ),
      mobileRender: (org) => (
        <div className="flex items-center justify-between space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-gray-900">{org.user_count}/{org.total_users_limit}</span>
          </div>
          <div className="flex items-center space-x-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-gray-900">{org.loan_count}/{org.monthly_loan_limit}</span>
          </div>
          <div className="text-gray-500 text-xs">{org.borrower_count} borrowers</div>
        </div>
      ),
    },
    {
      key: 'created',
      label: 'Created',
      render: (org) => (
        <div className="text-sm text-gray-500">
          {formatDate(org.created_at)}
        </div>
      ),
    },
  ];

  const actions: Action<Organization>[] = [
    {
      icon: Eye,
      label: 'View Details',
      onClick: (org) => {
        // TODO: Implement view details
        console.log('View org:', org.id);
      },
      color: 'blue',
    },
    {
      icon: Edit,
      label: 'Edit Organization',
      onClick: (org) => {
        // TODO: Implement edit
        console.log('Edit org:', org.id);
      },
      color: 'green',
    },
    {
      icon: Trash2,
      label: 'Delete Organization',
      onClick: (org) => setDeleteConfirm({ show: true, org }),
      color: 'red',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Organization Management</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage all organizations and their subscriptions</p>
        </div>
        <button className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 sm:px-6 py-3 rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 whitespace-nowrap" onClick={() => setShowAddForm(true)}>
          <Building2 className="w-5 h-5" />
          <span>Add Organization</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search organizations by name, email, or contact person..."
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
              onChange={(value) => setFilterStatus(value)}
              placeholder="Filter by status"
              className="w-full px-4 py-3 rounded-2xl border-0 bg-white/60 backdrop-blur-sm shadow-sm focus:ring-2 focus:ring-green-500 focus:outline-none text-sm text-gray-900 transition-all duration-300 flex items-center justify-between"
            />
          </div>
        </div>
      </div>

      {/* Stats Header */}
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">All Organizations</h3>
            <p className="text-gray-600">
              {filteredOrganizations.length} of {organizations.length} organizations
              {filterStatus !== 'all' && ` • Filtered by: ${statusOptions.find(s => s.value === filterStatus)?.label}`}
            </p>
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <DataTable
        data={filteredOrganizations}
        columns={columns}
        actions={actions}
        loading={loading}
        error={error}
        emptyState={{
          icon: <Building2 className="w-10 h-10 text-green-500" />,
          title: searchTerm || filterStatus !== 'all' ? 'No organizations match your criteria' : 'No organizations yet',
          description: searchTerm || filterStatus !== 'all' 
            ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
            : 'Get started by adding your first organization to the platform.',
        }}
        getItemKey={(org) => org.id}
      />

      {/* Add Organization Form Modal */}
      {showAddForm && (
        <AddOrganizationForm
          onClose={() => setShowAddForm(false)}
          onSuccess={fetchOrganizations}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && deleteConfirm.org && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-red-100 rounded-2xl">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Delete Organization</h2>
                <p className="text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="mb-6 p-4 bg-gray-50 rounded-2xl">
              <p className="text-sm text-gray-700 mb-2">
                Are you sure you want to delete <strong>{deleteConfirm.org.name}</strong>?
              </p>
              <p className="text-sm text-gray-600">
                This will permanently delete:
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li>• The organization</li>
                <li>• All {deleteConfirm.org.user_count || 0} associated users</li>
                <li>• All {deleteConfirm.org.loan_count || 0} associated loans</li>
                <li>• All authentication accounts</li>
              </ul>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setDeleteConfirm({ show: false, org: null })}
                disabled={deleting}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirm.org && handleDelete(deleteConfirm.org)}
                disabled={deleting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}