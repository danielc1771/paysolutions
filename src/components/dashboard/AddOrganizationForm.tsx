'use client';

import React, { useState } from 'react';
import { Building2, Mail, User, X } from 'lucide-react';

interface AddOrganizationFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface OrganizationFormData {
  // Required fields
  name: string;
  email: string;
  contactPerson: string;
  subscriptionStatus: 'trial' | 'active' | 'suspended' | 'cancelled';
  // Phone will be collected during onboarding
  phone?: string;
  // Optional fields - can be added later via admin dashboard
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  monthlyLoanLimit?: number;
  totalUsersLimit?: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  website?: string;
  description?: string;
  taxId?: string;
}

export default function AddOrganizationForm({ onClose, onSuccess }: AddOrganizationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<OrganizationFormData>({
    name: '',
    email: '',
    contactPerson: '',
    phone: '',
    subscriptionStatus: 'trial',
  });

  const handleInputChange = (field: keyof OrganizationFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate organization name
    if (!formData.name || formData.name.trim().length === 0) {
      errors.name = 'Organization name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Organization name must be at least 2 characters';
    }

    // Validate contact person
    if (!formData.contactPerson || formData.contactPerson.trim().length === 0) {
      errors.contactPerson = 'Contact person name is required';
    } else if (formData.contactPerson.trim().length < 2) {
      errors.contactPerson = 'Contact person name must be at least 2 characters';
    }

    // Validate email
    if (!formData.email || formData.email.trim().length === 0) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone is optional - will be collected during onboarding
    if (formData.phone && formData.phone.trim().length > 0 && formData.phone.trim().length < 10) {
      errors.phone = 'Please enter a valid phone number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFieldErrors({});

    // Validate form before submitting
    if (!validateForm()) {
      setError('Please fix the errors below before submitting');
      return;
    }

    setLoading(true);

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
        // Check if there are specific field errors from the backend
        if (result.details && result.details.fieldErrors) {
          // Parse Zod validation errors
          const backendErrors: Record<string, string> = {};
          Object.entries(result.details.fieldErrors).forEach(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
              backendErrors[field] = messages[0];
            }
          });
          setFieldErrors(backendErrors);
          setError('Please fix the validation errors below');
        } else if (result.details) {
          // Show formatted error with details
          const errorMessages = Object.values(result.details.fieldErrors || {})
            .flat()
            .join(', ');
          setError(`Validation Error: ${errorMessages || result.error || 'Invalid input'}`);
        } else {
          setError(result.error || 'Failed to create organization. Please try again.');
        }
        return;
      }

      setSuccess(`Organization "${formData.name}" created successfully! Invitation sent to ${formData.email}`);

      // Reset form
      setFormData({
        name: '',
        email: '',
        contactPerson: '',
        phone: '',
        subscriptionStatus: 'trial',
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
                  <Building2 className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${fieldErrors.name ? 'text-red-400' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${fieldErrors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'} focus:ring-2 focus:border-transparent text-gray-900 bg-white`}
                    placeholder="Enter organization name"
                  />
                </div>
                {fieldErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person Name *
                </label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${fieldErrors.contactPerson ? 'text-red-400' : 'text-gray-400'}`} />
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${fieldErrors.contactPerson ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'} focus:ring-2 focus:border-transparent text-gray-900 bg-white`}
                    placeholder="John Doe"
                  />
                </div>
                {fieldErrors.contactPerson && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.contactPerson}</p>
                )}
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email *
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${fieldErrors.email ? 'text-red-400' : 'text-gray-400'}`} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${fieldErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-green-500'} focus:ring-2 focus:border-transparent text-gray-900 bg-white`}
                    placeholder="contact@organization.com"
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Phone and business details will be collected during owner onboarding</p>
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

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Subscription dates, loan limits, and user limits can be configured later through the organization settings in the admin dashboard.
              </p>
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
