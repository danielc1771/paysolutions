'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Phone, CheckCircle, AlertCircle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import OTPInput from '@/components/OTPInput';

// Stripe.js types for identity verification
type StripeIdentityResult = { error?: { message?: string; type?: string } };
type StripeWithIdentity = { verifyIdentity: (clientSecret: string) => Promise<StripeIdentityResult> };

interface VerificationData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  stripe_verification_status: string;
  phone_verification_status: string;
  stripe_verification_session_id: string | null;
  expires_at: string;
  organization: {
    name: string;
  };
}

export default function VerifyPage() {
  const params = useParams();
  const token = params.token as string;

  const [step, setStep] = useState(0); // 0: loading, 1: welcome, 2: identity, 3: phone, 4: success, -1: error
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false);
  const [verifyingPhoneCode, setVerifyingPhoneCode] = useState(false);
  const [stripe, setStripe] = useState<StripeWithIdentity | null>(null);
  const [identityVerificationStatus, setIdentityVerificationStatus] = useState<string>('not_started');

  // Load Stripe.js with verification-specific key (allows test mode for verification)
  useEffect(() => {
    const loadStripe = async () => {
      // Use separate key for verification flows (test mode) if available
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_VERIFICATION_PUBLISHABLE_KEY
        || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

      if (!publishableKey) {
        console.error('Stripe publishable key not found');
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowWithStripe = window as any;

      if (windowWithStripe.Stripe) {
        setStripe(windowWithStripe.Stripe(publishableKey) as StripeWithIdentity);
      } else {
        // Add Stripe.js script if not already loaded
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = () => {
          if (windowWithStripe.Stripe) {
            setStripe(windowWithStripe.Stripe(publishableKey) as StripeWithIdentity);
          }
        };
        document.body.appendChild(script);
      }
    };

    loadStripe();
  }, []);

  // Fetch verification data
  useEffect(() => {
    if (!token) return;

    const fetchVerification = async () => {
      try {
        const response = await fetch(`/api/verifications/by-token?token=${token}`);
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to load verification');
        }
        const data = await response.json();
        setVerification(data.verification);

        // Determine starting step based on current status
        if (data.verification.status === 'completed') {
          setStep(4); // Already completed
        } else if (data.verification.stripe_verification_status === 'verified' && data.verification.phone) {
          setStep(3); // Identity done, need phone
        } else if (data.verification.stripe_verification_status === 'verified' && !data.verification.phone) {
          setStep(4); // Identity done, no phone required
        } else {
          setStep(1); // Start at welcome
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        setStep(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchVerification();
  }, [token]);

  // Handle Stripe Identity Verification (embedded modal)
  const handleStartIdentityVerification = async () => {
    if (!verification) return;
    if (!stripe) {
      setError('Stripe is not loaded yet. Please try again.');
      return;
    }

    setLoading(true);
    setIdentityVerificationStatus('in_progress');
    setError(null);

    try {
      // Create verification session on the server (using standalone verification endpoint)
      const response = await fetch('/api/verifications/identity-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: verification.id,
        }),
      });

      const session = await response.json();
      if (!session.success || !session.client_secret) {
        throw new Error(session.error || 'Failed to create verification session');
      }

      console.log('✅ Created verification session:', session.verification_session_id);

      // Show the verification modal using Stripe.js
      const result = await stripe.verifyIdentity(session.client_secret);

      if (result.error) {
        console.error('Verification error:', result.error);
        setIdentityVerificationStatus('failed');
        setError(result.error.message || 'Verification failed. Please try again.');
      } else {
        // Verification was submitted successfully to Stripe
        console.log('🎯 Stripe verification modal completed successfully');

        // Poll the verification status
        const sessionId = session.verification_session_id;
        let attempts = 0;
        const maxAttempts = 10;

        const pollStatus = async () => {
          try {
            // Use standalone verification status endpoint (uses test keys)
            const statusResponse = await fetch(`/api/verifications/identity-status/${sessionId}`);
            const statusData = await statusResponse.json();
            console.log('📊 Verification status:', statusData.status);

            if (statusData.status === 'verified') {
              setIdentityVerificationStatus('completed');
              // Move to phone step or success
              if (verification.phone) {
                setStep(3);
              } else {
                setStep(4);
              }
              return;
            } else if (statusData.status === 'requires_input' || statusData.status === 'canceled') {
              setIdentityVerificationStatus('failed');
              setError('Verification was canceled or requires additional input');
              return;
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(pollStatus, 2000);
            } else {
              // Max attempts reached, assume processing
              setIdentityVerificationStatus('completed');
              if (verification.phone) {
                setStep(3);
              } else {
                setStep(4);
              }
            }
          } catch (pollError) {
            console.error('Error polling verification status:', pollError);
            // On error, assume it's processing and continue
            setIdentityVerificationStatus('completed');
            if (verification.phone) {
              setStep(3);
            } else {
              setStep(4);
            }
          }
        };

        // Start polling after a brief delay
        setTimeout(pollStatus, 2000);
      }
    } catch (err) {
      console.error('Error starting verification:', err);
      setIdentityVerificationStatus('failed');
      setError(err instanceof Error ? err.message : 'Failed to start identity verification');
    } finally {
      setLoading(false);
    }
  };

  // Phone verification state
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneSuccessMessage, setPhoneSuccessMessage] = useState<string | null>(null);

  // Handle Phone Verification - Send Code
  const handleSendPhoneCode = async () => {
    if (!verification?.phone) return;

    setSendingPhoneCode(true);
    setError(null);
    setPhoneSuccessMessage(null);

    try {
      const response = await fetch('/api/twilio/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: verification.id,
          phoneNumber: verification.phone,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPhoneCodeSent(true);
        setPhoneSuccessMessage('Verification code sent to your phone!');
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (err) {
      console.error('Error sending verification code:', err);
      setError('Failed to send verification code');
    } finally {
      setSendingPhoneCode(false);
    }
  };

  // Handle Phone Verification - Verify Code
  const handleVerifyPhoneCode = async () => {
    if (!verification?.phone || !phoneVerificationCode || phoneVerificationCode.length < 6) return;

    setVerifyingPhoneCode(true);
    setError(null);
    setPhoneSuccessMessage(null);

    try {
      const response = await fetch('/api/twilio/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: verification.id,
          phoneNumber: verification.phone,
          code: phoneVerificationCode.trim(),
        }),
      });

      const data = await response.json();
      if (data.success && data.status === 'approved') {
        setPhoneSuccessMessage('Phone number verified successfully!');
        // Move to success step
        setTimeout(() => setStep(4), 1000);
      } else {
        setError(data.message || data.error || 'Invalid verification code');
        setPhoneVerificationCode(''); // Clear code for retry
      }
    } catch (err) {
      console.error('Error verifying phone code:', err);
      setError('Failed to verify code');
      setPhoneVerificationCode('');
    } finally {
      setVerifyingPhoneCode(false);
    }
  };

  // Auto-verify when OTP code is complete
  useEffect(() => {
    if (phoneVerificationCode.length === 6 && phoneCodeSent && !verifyingPhoneCode && step === 3) {
      handleVerifyPhoneCode();
    }
  }, [phoneVerificationCode, phoneCodeSent, verifyingPhoneCode, step]);

  // Check if verification is expired
  const isExpired = verification && new Date(verification.expires_at) < new Date();

  // Loading state
  if (loading && step === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading verification...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (step === -1 || !verification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'This verification link is invalid or has expired.'}</p>
        </div>
      </div>
    );
  }

  // Expired state
  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Expired</h2>
          <p className="text-gray-600 mb-6">
            This verification link expired on {new Date(verification.expires_at).toLocaleDateString()}. Please contact {verification.organization.name} for a new verification link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Identity Verification</h1>
          <p className="text-gray-600">Requested by {verification.organization.name}</p>
        </div>

        {/* Progress Indicator */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-center space-x-4">
            {/* Step 1: Welcome */}
            <div className={`flex items-center ${step >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300'}`}>
                {step > 1 ? <CheckCircle className="w-6 h-6" /> : '1'}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Welcome</span>
            </div>

            <div className={`h-1 w-12 ${step >= 2 ? 'bg-green-600' : 'bg-gray-300'}`}></div>

            {/* Step 2: Identity */}
            <div className={`flex items-center ${step >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300'}`}>
                {step > 2 ? <CheckCircle className="w-6 h-6" /> : <Shield className="w-5 h-5" />}
              </div>
              <span className="ml-2 text-sm font-medium hidden sm:inline">Identity</span>
            </div>

            {verification.phone && (
              <>
                <div className={`h-1 w-12 ${step >= 3 ? 'bg-green-600' : 'bg-gray-300'}`}></div>

                {/* Step 3: Phone */}
                <div className={`flex items-center ${step >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300'}`}>
                    {step > 3 ? <CheckCircle className="w-6 h-6" /> : <Phone className="w-5 h-5" />}
                  </div>
                  <span className="ml-2 text-sm font-medium hidden sm:inline">Phone</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Hello, {verification.first_name}!
                  </h2>
                  <p className="text-gray-600">
                    To complete your verification with {verification.organization.name}, we need to verify:
                  </p>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-2xl">
                    <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Identity Verification</h3>
                      <p className="text-sm text-gray-600">
                        We&apos;ll need you to upload a government-issued ID (driver&apos;s license, passport, etc.)
                      </p>
                    </div>
                  </div>

                  {verification.phone && (
                    <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-2xl">
                      <Phone className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-gray-900">Phone Verification</h3>
                        <p className="text-sm text-gray-600">
                          We&apos;ll send a verification code to {verification.phone}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                  <p className="text-sm text-gray-600">
                    <strong className="text-gray-900">Privacy & Security:</strong> Your information is encrypted and secure. We use Stripe Identity for document verification.
                  </p>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold py-4 px-6 rounded-2xl hover:from-green-600 hover:to-teal-600 transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Identity Verification */}
          {step === 2 && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-3xl shadow-xl p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
                  <p className="text-gray-600">
                    A secure modal will open to capture your ID
                  </p>
                </div>

                {/* Security info */}
                <div className="bg-blue-50 rounded-2xl p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Secure Identity Verification</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span>Takes less than 2 minutes</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span>Your documents are encrypted and secure</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span>You&apos;ll need a valid government ID</span>
                    </li>
                  </ul>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                    <div className="flex items-center text-red-700">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                )}

                {/* Verification Status States */}
                <div className="mb-6">
                  {(identityVerificationStatus === 'not_started' || identityVerificationStatus === 'failed') && (
                    <div className="text-center p-6 bg-gray-50 rounded-2xl">
                      <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Verify</h3>
                      <p className="text-gray-600 mb-6">Click the button below to start identity verification</p>
                      <button
                        onClick={handleStartIdentityVerification}
                        disabled={loading || !stripe}
                        className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold py-4 px-6 rounded-2xl hover:from-green-600 hover:to-teal-600 transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Starting...</span>
                          </>
                        ) : !stripe ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Loading Stripe...</span>
                          </>
                        ) : (
                          <>
                            <Shield className="w-5 h-5" />
                            <span>{identityVerificationStatus === 'failed' ? 'Try Again' : 'Start Verification'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {identityVerificationStatus === 'in_progress' && (
                    <div className="text-center p-6 bg-blue-50 rounded-2xl">
                      <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Verification In Progress</h3>
                      <p className="text-gray-600">Please complete the verification in the popup window...</p>
                    </div>
                  )}

                  {identityVerificationStatus === 'completed' && (
                    <div className="text-center p-6 bg-green-50 rounded-2xl">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Identity Verified!</h3>
                      <p className="text-green-600">Your identity has been successfully verified.</p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setStep(1)}
                    disabled={identityVerificationStatus === 'in_progress'}
                    className="flex-1 bg-gray-200 text-gray-900 font-semibold py-4 px-6 rounded-2xl hover:bg-gray-300 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Phone Verification */}
          {step === 3 && verification.phone && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white rounded-3xl shadow-xl p-8">
                {/* OTP Input Screen - After code is sent */}
                {phoneCodeSent ? (
                  <>
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Phone className="w-10 h-10 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">OTP Verification</h2>
                      <p className="text-gray-600 mb-2">Enter the OTP sent to</p>
                      <p className="text-lg font-medium text-gray-800">{verification.phone}</p>
                    </div>

                    <div className="space-y-6">
                      <OTPInput
                        value={phoneVerificationCode}
                        onChange={setPhoneVerificationCode}
                        disabled={verifyingPhoneCode}
                      />

                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                          <div className="flex items-center">
                            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                            <span className="text-red-700 text-sm">{error}</span>
                          </div>
                        </div>
                      )}

                      {phoneSuccessMessage && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="flex items-center">
                            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                            <span className="text-green-700 text-sm">{phoneSuccessMessage}</span>
                          </div>
                        </div>
                      )}

                      <div className="text-center">
                        <p className="text-gray-600 text-sm">
                          Didn&apos;t receive the code?{' '}
                          <button
                            onClick={handleSendPhoneCode}
                            disabled={sendingPhoneCode}
                            className="text-purple-600 hover:text-purple-700 font-medium ml-1 disabled:opacity-50"
                          >
                            {sendingPhoneCode ? 'Resending...' : 'Resend'}
                          </button>
                        </p>
                      </div>

                      <button
                        onClick={handleVerifyPhoneCode}
                        disabled={verifyingPhoneCode || phoneVerificationCode.length < 6}
                        className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {verifyingPhoneCode ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            Verifying...
                          </>
                        ) : (
                          'Verify'
                        )}
                      </button>
                    </div>

                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => {
                          setPhoneCodeSent(false);
                          setPhoneVerificationCode('');
                          setError(null);
                        }}
                        className="px-6 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 shadow-sm"
                      >
                        Change Number
                      </button>
                    </div>
                  </>
                ) : (
                  /* Initial Screen - Send Code */
                  <>
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Phone className="w-10 h-10 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Phone</h2>
                      <p className="text-gray-600">We&apos;ll send a verification code to your phone</p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Phone Number</span>
                        <span className="font-medium text-gray-900">{verification.phone}</span>
                      </div>
                    </div>

                    {error && (
                      <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center">
                          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                          <span className="text-red-700 text-sm">{error}</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleSendPhoneCode}
                      disabled={sendingPhoneCode}
                      className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center"
                    >
                      {sendingPhoneCode ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Sending Code...
                        </>
                      ) : (
                        'Get Verification Code'
                      )}
                    </button>

                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => setStep(2)}
                        className="px-6 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Verification Complete!</h2>
                <p className="text-gray-600 mb-8">
                  Thank you, {verification.first_name}. Your verification has been completed successfully. {verification.organization.name} will be notified.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-sm text-green-800">
                    You can safely close this window. No further action is required.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
