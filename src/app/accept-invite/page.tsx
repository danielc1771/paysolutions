'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AlertCircle, CheckCircle, Loader2, User, Lock, Phone, Building2 } from 'lucide-react';

export default function AcceptInvitePage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cellPhone, setCellPhone] = useState('');
  const [dealerLicenseNumber, setDealerLicenseNumber] = useState('');
  const [einNumber, setEinNumber] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidInvite, setIsValidInvite] = useState<boolean | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const verifyInvite = useCallback(async (session: Record<string, unknown> | null) => {
    if (!session) {
      setIsValidInvite(false);
      setError('Invalid or expired invitation link.');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('status, organization_id')
      .eq('id', (session.user as Record<string, unknown>).id)
      .single();

    if (profileError || !profile) {
      setIsValidInvite(false);
      setError('Could not verify invitation. The link may be invalid.');
    } else if (profile.status !== 'INVITED') {
      setIsValidInvite(false);
      setError('This invitation has already been used or is no longer valid.');
    } else {
      setIsValidInvite(true);
      setOrganizationId(profile.organization_id);
      
      // Pre-fill business phone if organization exists
      if (profile.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('phone')
          .eq('id', profile.organization_id)
          .single();
        
        if (org?.phone) {
          setBusinessPhone(org.phone);
        }
      }
    }
  }, [supabase]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(({ data: { session } }) => {
          verifyInvite(session as Record<string, unknown> | null);
        });
      } else {
        setIsValidInvite(false);
      }
    } else {
      setIsValidInvite(false);
    }

  }, [verifyInvite, supabase.auth]);

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }
    if (!cellPhone.trim()) {
      setError('Cell phone is required');
      setLoading(false);
      return;
    }
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
      const { data: { user }, error: userError } = await supabase.auth.updateUser({
        password: password,
        data: { full_name: fullName },
      });

      if (userError) {
        setError(userError.message);
      } else if (user) {
        // Update profile with cell phone
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            full_name: fullName, 
            cell_phone: cellPhone,
            status: 'ACTIVE' 
          })
          .eq('id', user.id);

        if (profileError) {
          setError(profileError.message);
        } else if (organizationId) {
          // Update organization with business info
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
            setSuccess(true);
            // Redirect to dashboard after a brief delay to show success message
            setTimeout(() => {
              router.push('/dashboard');
            }, 1500);
          }
        } else {
          setError('Organization not found');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Aboard!</h2>
            <p className="text-gray-600 mb-4">Your account has been successfully created.</p>
            <div className="flex items-center justify-center text-purple-600">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="font-medium">Redirecting to your dashboard...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-4">
          <Image 
            src="/logoMain.png" 
            alt="iPayUS Logo" 
            width={200} 
            height={200}
            className="rounded-2xl shadow-lg mx-auto"
          />
        </div>

        <div className="relative bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-white/30 p-8 z-10">
          {isValidInvite === null && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
              <p className="text-gray-600 font-medium">Verifying invitation...</p>
            </div>
          )}

          {isValidInvite === false && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
              <p className="text-gray-600">{error || 'This link is either invalid or has expired.'}</p>
            </div>
          )}

          {isValidInvite && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Accept Invitation</h1>
                <p className="text-gray-600">Create your password to get started.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleAcceptInvite} className="space-y-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300"
                      placeholder="Create a strong password"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300"
                      placeholder="Confirm your password"
                      required
                    />
                  </div>
                </div>

                {/* Contact Information Section */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Contact Information</h3>
                  
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCellPhone(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300"
                        placeholder="(555) 123-4567"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Business Information Section */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Business Information</h3>
                  
                  <div className="space-y-4">
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDealerLicenseNumber(e.target.value)}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEinNumber(e.target.value)}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusinessPhone(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300"
                          placeholder="(555) 987-6543"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Setting up account...
                    </div>
                  ) : (
                    'Complete Setup & Login'
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
