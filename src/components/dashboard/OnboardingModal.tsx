'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, Phone, Building2, CheckCircle, Loader2 } from 'lucide-react';

interface OnboardingModalProps {
  onClose: () => void;
  onComplete: () => void;
  organizationId: string;
  userId: string;
  initialBusinessPhone?: string;
}

export default function OnboardingModal({ 
  onClose, 
  onComplete, 
  organizationId, 
  userId,
  initialBusinessPhone = ''
}: OnboardingModalProps) {
  const [step, setStep] = useState(1); // 1: contact, 2: business
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Contact Info
  const [cellPhone, setCellPhone] = useState('');
  
  // Business Info
  const [dealerLicenseNumber, setDealerLicenseNumber] = useState('');
  const [einNumber, setEinNumber] = useState('');
  const [businessPhone, setBusinessPhone] = useState(initialBusinessPhone);
  
  const supabase = createClient();

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!cellPhone.trim()) {
      setError('Cell phone is required');
      setLoading(false);
      return;
    }

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ cell_phone: cellPhone })
        .eq('id', userId);

      if (profileError) {
        setError(profileError.message);
      } else {
        setStep(2);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!dealerLicenseNumber.trim()) {
      setError('Dealer license number is required');
      setLoading(false);
      return;
    }
    if (!einNumber.trim()) {
      setError('EIN number is required');
      setLoading(false);
      return;
    }
    if (!businessPhone.trim()) {
      setError('Business phone is required');
      setLoading(false);
      return;
    }

    try {
      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          dealer_license_number: dealerLicenseNumber,
          ein_number: einNumber,
          phone: businessPhone
        })
        .eq('id', organizationId);

      if (orgError) {
        setError(orgError.message);
      } else {
        onComplete();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 max-w-md w-full">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 1 ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-purple-500' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 2 ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Step 1: Contact Information */}
        {step === 1 && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact Information</h2>
              <p className="text-gray-600">Let&apos;s start with your personal contact details</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-6">
              <div>
                <label htmlFor="cellPhone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Cell Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    id="cellPhone"
                    value={cellPhone}
                    onChange={(e) => setCellPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300"
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Next'
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Step 2: Business Information */}
        {step === 2 && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Information</h2>
              <p className="text-gray-600">Complete your organization details</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleBusinessSubmit} className="space-y-4">
              <div>
                <label htmlFor="dealerLicenseNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                  Dealer License Number
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="dealerLicenseNumber"
                    value={dealerLicenseNumber}
                    onChange={(e) => setDealerLicenseNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300"
                    placeholder="DL123456"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="einNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                  EIN Number
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="einNumber"
                    value={einNumber}
                    onChange={(e) => setEinNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300"
                    placeholder="12-3456789"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="businessPhone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    id="businessPhone"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300"
                    placeholder="(555) 987-6543"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Complete'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
