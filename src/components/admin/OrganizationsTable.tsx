'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Building2, Users, DollarSign, Calendar, Edit, Trash2, Eye } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import AddOrganizationForm from './AddOrganizationForm';

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

  const supabase = createClient();

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Organization Management</h2>
          <p className="text-gray-600">Manage all organizations and their subscriptions</p>
        </div>
        <button className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2" onClick={() => setShowAddForm(true)}>
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

      {/* Organizations Table */}
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
        <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100/50">
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

        {loading ? (
          <div className="p-12 text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">Loading organizations...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load organizations</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={fetchOrganizations}
              className="bg-red-500 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-red-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {searchTerm || filterStatus !== 'all' ? 'No organizations match your criteria' : 'No organizations yet'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search terms or filters to find what you&apos;re looking for.'
                : 'Get started by adding your first organization to the platform.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {filteredOrganizations.map((org) => (
                  <tr key={org.id} className="hover:bg-white/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{org.name}</div>
                          <div className="text-sm text-gray-500">
                            {org.is_active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{org.contact_person || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{org.email}</div>
                      <div className="text-sm text-gray-500">{org.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(org.subscription_status)}`}>
                          {org.subscription_status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Ends: {formatDate(org.subscription_end_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-4 text-sm text-gray-900">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-blue-500" />
                          <span>{org.user_count}/{org.total_users_limit}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <span>{org.loan_count}/{org.monthly_loan_limit}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {org.borrower_count} borrowers
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        {formatDate(org.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-green-500 rounded-lg hover:bg-green-50 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Organization Form Modal */}
      {showAddForm && (
        <AddOrganizationForm
          onClose={() => setShowAddForm(false)}
          onSuccess={fetchOrganizations}
        />
      )}
    </div>
  );
}