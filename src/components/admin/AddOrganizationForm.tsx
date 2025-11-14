'use client';

import React, { useState } from 'react';
import { Building2, Mail, User, Phone, Calendar, Users, DollarSign, X } from 'lucide-react';

interface AddOrganizationFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface OrganizationFormData {
  name: string;
  email: string;
  contactPerson: string;
  phone: string;
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  monthlyLoanLimit: number;
  totalUsersLimit: number;
  // Optional fields
  address: string;
  city: string;
  state: string;
  zipCode: string;
  website: string;
  description: string;
  taxId: string;
}

export default function AddOrganizationForm({ onClose, onSuccess }: AddOrganizationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    email: '',
    contactPerson: '',
    phone: '',
    subscriptionStatus: 'trial',
    subscriptionStartDate: '',
    subscriptionEndDate: '',
    monthlyLoanLimit: 100,
    totalUsersLimit: 10,
    address: '',
    city: '',
    state: '',
    zipCode: '',
    website: '',
    description: '',
    taxId: '',
  });

  const handleInputChange = (field: keyof OrganizationFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create organization');
      }

      setSuccess(`Organization "${formData.name}" created successfully! Invitation sent to ${formData.email}`);

      // Reset form
      setFormData({
        name: '',
        email: '',
        contactPerson: '',
        phone: '',
        subscriptionStatus: 'trial',
        subscriptionStartDate: '',
        subscriptionEndDate: '',
        monthlyLoanLimit: 100,
        totalUsersLimit: 10,
        address: '',
        city: '',
        state: '',
        zipCode: '',
        website: '',
        description: '',
        taxId: '',
      });

      // Call success callback to refresh the organizations list
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add New Organization</h2>
              <p className="text-gray-600">Create an organization and invite the owner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Status Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-700">{success}</span>
              </div>
            </div>
          )}

          {/* Required Fields Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">Required Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Organization Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Enter organization name"
                  />
                </div>
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="contact@organization.com"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>

              {/* Subscription Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Status *
                </label>
                <select
                  required
                  value={formData.subscriptionStatus}
                  onChange={(e) => handleInputChange('subscriptionStatus', e.target.value as 'trial' | 'active' | 'suspended' | 'cancelled')}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.subscriptionStartDate}
                    onChange={(e) => handleInputChange('subscriptionStartDate', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subscription End Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.subscriptionEndDate}
                    onChange={(e) => handleInputChange('subscriptionEndDate', e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Loan Limit *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.monthlyLoanLimit}
                    onChange={(e) => handleInputChange('monthlyLoanLimit', parseInt(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Users Limit *
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.totalUsersLimit}
                    onChange={(e) => handleInputChange('totalUsersLimit', parseInt(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Optional Fields Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-900">Optional Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="New York"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="NY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="10001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="https://www.organization.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => handleInputChange('taxId', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="12-3456789"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white resize-none"
                  placeholder="Brief description of the organization..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Creating Organization...</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>Create Organization & Send Invite</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
