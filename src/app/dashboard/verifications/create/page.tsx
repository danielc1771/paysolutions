'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ShieldCheck, Mail, Phone, User, AlertCircle, CheckCircle, Link as LinkIcon } from 'lucide-react';

export default function CreateVerification() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    verificationLink: string;
    email: string;
  } | null>(null);
  const [createdVerificationId, setCreatedVerificationId] = useState<string | null>(null);
  const [organizationInfo, setOrganizationInfo] = useState<{
    id: string;
    name: string;
    verifications_require_phone: boolean;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({});
  const [copiedLink, setCopiedLink] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    purpose: '',
  });

  // Fetch organization information on component mount
  useEffect(() => {
    const fetchOrganizationInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select(`
              organization_id,
              organizations (
                name
              )
            `)
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            setError('Unable to fetch organization information');
            return;
          }

          if (profile?.organizations) {
            const organization = profile.organizations as unknown as { name: string };
            // Fetch organization settings for phone requirement
            const { data: settings } = await supabase
              .from('organization_settings')
              .select('verifications_require_phone')
              .eq('organization_id', profile.organization_id)
              .single();

            const orgInfo = {
              id: profile.organization_id,
              name: organization.name,
              verifications_require_phone: settings?.verifications_require_phone ?? true,
            };
            console.log('✅ Organization info loaded:', orgInfo);
            setOrganizationInfo(orgInfo);
          }
        }
      } catch (err) {
        console.error('Error fetching organization info:', err);
        setError('Unable to fetch organization information');
      }
    };

    fetchOrganizationInfo();
  }, [supabase]);

  // Validation function
  const validateForm = () => {
    const errors: {[key: string]: boolean} = {};
    let isValid = true;

    // Required field validation
    if (!formData.firstName.trim()) {
      errors.firstName = true;
      isValid = false;
    }
    if (!formData.lastName.trim()) {
      errors.lastName = true;
      isValid = false;
    }
    if (!formData.email.trim()) {
      errors.email = true;
      isValid = false;
    }

    // Email format validation
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = true;
      isValid = false;
    }

    // Phone validation if required
    if (organizationInfo?.verifications_require_phone && !formData.phone.trim()) {
      errors.phone = true;
      isValid = false;
    }

    // Phone format validation (if provided)
    if (formData.phone.trim() && !/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.phone = true;
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setValidationErrors({});

    // Validate form before submission
    if (!validateForm()) {
      setError('Please fill in all required fields correctly.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/verifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          purpose: formData.purpose || undefined,
        }),
      });

      const contentType = response.headers.get('content-type');
      let result;

      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse);
        throw new Error(`Server error: Received HTML instead of JSON. Status: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to create verification');
      }

      setSuccessData({
        verificationLink: result.verification_link,
        email: formData.email,
      });
      setCreatedVerificationId(result.id || null);
      setShowSuccessModal(true);

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        purpose: '',
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (successData?.verificationLink) {
      await navigator.clipboard.writeText(successData.verificationLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100">
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-3">
            Create New Verification
          </h1>
          <p className="text-gray-600 text-lg">Send an identity verification request to a customer</p>
        </div>

        {/* Create Verification Form */}
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden max-w-4xl">
          {/* Status Messages */}
          {error && (
            <div className="p-6 bg-red-50 border-b border-red-200">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center">
                <ShieldCheck className="w-5 h-5 text-blue-500 mr-2" />
                <p className="text-blue-700 text-sm">
                  This will send an email to the customer with a secure link to complete their identity verification.
                  {organizationInfo?.verifications_require_phone && ' Phone verification is required for your organization.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Customer Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-2xl border ${validationErrors.firstName ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white`}
                    placeholder="John"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-2xl border ${validationErrors.lastName ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white`}
                    placeholder="Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-2xl border ${validationErrors.email ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white`}
                    placeholder="john@example.com"
                  />
                  <p className="mt-1 text-xs text-gray-500">Verification link will be sent to this email</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    Phone Number {organizationInfo?.verifications_require_phone && '*'}
                  </label>
                  <input
                    type="tel"
                    required={organizationInfo?.verifications_require_phone}
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className={`w-full px-4 py-3 rounded-2xl border ${validationErrors.phone ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'} focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white`}
                    placeholder="+1234567890"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {organizationInfo?.verifications_require_phone
                      ? 'Include country code (e.g., +1 for US)'
                      : 'Optional - Include country code (e.g., +1 for US)'}
                  </p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Purpose/Notes</label>
                  <textarea
                    value={formData.purpose}
                    onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white resize-none"
                    placeholder="Optional notes about this verification request..."
                  />
                  <p className="mt-1 text-xs text-gray-500">Internal notes - not visible to customer</p>
                </div>

                {/* Organization Information (Auto-populated) */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Organization</h4>
                  {organizationInfo ? (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                      <p className="text-green-900 font-semibold">{organizationInfo.name}</p>
                      <p className="text-green-600 text-sm mt-2 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        This information will be included in the verification
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                      <p className="text-gray-600 text-center">Loading organization information...</p>
                    </div>
                  )}
                </div>

                {/* Verification Requirements */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Verification Requirements</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-2" />
                      Identity verification via Stripe (ID document upload)
                    </li>
                    {organizationInfo?.verifications_require_phone && (
                      <li className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-2" />
                        Phone verification via SMS code
                      </li>
                    )}
                    <li className="flex items-center">
                      <CheckCircle className="w-3 h-3 mr-2" />
                      Link expires in 7 days
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push('/dashboard/verifications')}
                className="px-6 py-3 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !organizationInfo}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Create & Send Verification</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-full max-w-lg border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Created!</h2>
              <p className="text-gray-600 mb-6">
                Verification request sent to <strong>{successData.email}</strong>
              </p>

              {/* Copyable Link */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Verification Link</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={successData.verificationLink}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-600 font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
                  >
                    {copiedLink ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Share this link directly with the customer if needed</p>
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold py-3 px-6 rounded-2xl hover:from-green-600 hover:to-teal-600 transition-all duration-300"
                  onClick={() => {
                    setShowSuccessModal(false);
                    router.push('/dashboard/verifications');
                  }}
                >
                  View All Verifications
                </button>
                {createdVerificationId && (
                  <button
                    className="w-full bg-white text-green-600 border border-green-600 font-semibold py-3 px-6 rounded-2xl hover:bg-green-50 transition-all duration-300"
                    onClick={() => {
                      setShowSuccessModal(false);
                      router.push(`/dashboard/verifications/${createdVerificationId}`);
                    }}
                  >
                    View Verification Details
                  </button>
                )}
                <button
                  className="w-full bg-gray-200 text-gray-900 font-semibold py-3 px-6 rounded-2xl hover:bg-gray-300 transition-all duration-300"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setCopiedLink(false);
                  }}
                >
                  Create Another Verification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
