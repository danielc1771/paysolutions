'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, DollarSign, User, Mail, Phone, Loader2, AlertCircle, Calendar, Lock, MessageSquare, Globe } from 'lucide-react';
import Image from 'next/image';
import CustomSelect from '@/components/CustomSelect';
import { createClient } from '@/utils/supabase/client';
import OTPInput from '@/components/OTPInput';
import { LoanApplicationData } from '@/types/loan';
import { getTranslations, interpolate, Language } from '@/utils/translations';

// Main Page Component
export default function ApplyPage() {
  const params = useParams();
  const loanId = params.loanId as string;

  const [step, setStep] = useState(0); // 0: loading, 1: language, 2: welcome, 3-9: form steps, 10: success, -1: error
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [formData, setFormData] = useState<Record<string, unknown>>({
    // Phone verification
    phoneNumber: '',
    phoneVerificationStatus: 'pending',
    verificationCode: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    employmentStatus: 'employed',
    annualIncome: '',
    currentEmployerName: '',
    timeWithEmployment: '',
    reference1Name: '',
    reference1Phone: '',
    reference1Email: '',
    reference2Name: '',
    reference2Phone: '',
    reference2Email: '',
    reference3Name: '',
    reference3Phone: '',
    reference3Email: '',
    stripeVerificationSessionId: '',
    // Stripe verification
    stripeVerificationStatus: 'pending',
    // Consent preferences
    consentToContact: false,
    consentToText: false,
    consentToCall: false,
    communicationPreferences: 'email',
  });
  const [initialData, setInitialData] = useState<LoanApplicationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Guard against double submissions

  // SessionStorage helper functions
  const getSessionKey = useCallback(() => `loan_application_${loanId}`, [loanId]);

  const saveToSession = useCallback((data: Record<string, unknown>) => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(getSessionKey(), JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save to sessionStorage:', error);
      }
    }
  }, [getSessionKey]);

  const loadFromSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(getSessionKey());
        return saved ? JSON.parse(saved) : null;
      } catch (error) {
        console.warn('Failed to load from sessionStorage:', error);
        return null;
      }
    }
    return null;
  }, [getSessionKey]);

  const clearSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(getSessionKey());
      } catch (error) {
        console.warn('Failed to clear sessionStorage:', error);
      }
    }
  }, [getSessionKey]);

  useEffect(() => {
    if (!loanId) return;

    const fetchApplicationData = async () => {
      try {
        const response = await fetch(`/api/apply/${loanId}`);
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || 'Failed to load application details.');
        }
        const data = await response.json();
        setInitialData({...data, loanId});
        
        // Map database verification status to UI status consistently
        const mapVerificationStatus = (dbStatus: string) => {
          if (dbStatus === 'verified') return 'completed';
          return dbStatus;
        };

        // Check for saved session data first
        const sessionData = loadFromSession();
        
        if (sessionData) {
          // Restore from session but update verification statuses from server
          setFormData(prev => ({
            ...prev,
            ...sessionData,
            // Always get latest verification statuses from server
            phoneNumber: data.loan.verifiedPhoneNumber || sessionData.phoneNumber || '',
            phoneVerificationStatus: data.loan.phoneVerificationStatus || 'pending',
            stripeVerificationSessionId: data.loan.stripeVerificationSessionId ?? '',
            stripeVerificationStatus: mapVerificationStatus(data.loan.stripeVerificationStatus || 'pending'),
          }));
          setStep(sessionData.currentStep || data.loan.applicationStep || 1);
        } else {
          // Clean application state - only prefill basic identity and loan data
          setFormData(prev => ({
            ...prev,
            // Only basic identity (no personal details, employment, references)
            // Phone verification (only if already verified for this loan)
            phoneNumber: data.loan.verifiedPhoneNumber || '',
            phoneVerificationStatus: data.loan.phoneVerificationStatus || 'pending',
            // Stripe verification
            stripeVerificationSessionId: data.loan.stripeVerificationSessionId ?? '',
            stripeVerificationStatus: mapVerificationStatus(data.loan.stripeVerificationStatus || 'pending'),
          }));
          setStep(data.loan.applicationStep || 1);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        
        // If loan/borrower data is missing or corrupted, reset to fresh state
        if (errorMessage.includes('Loan not found') || errorMessage.includes('404') || 
            errorMessage.includes('already been submitted') || errorMessage.includes('invalid')) {
          console.log('🔄 Loan/borrower data missing or invalid, resetting application state...');
          // Clear session storage
          clearSession();
          // Reset form data to initial state
          setFormData({
            // Phone verification
            phoneNumber: '',
            verificationCode: '',
            phoneVerificationStatus: 'pending',
            // Personal details
            dateOfBirth: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            // Employment details
            employmentStatus: '',
            annualIncome: '',
            currentEmployerName: '',
            timeWithEmployment: '',
            // References
            reference1Name: '',
            reference1Phone: '',
            reference1Email: '',
            reference2Name: '',
            reference2Phone: '',
            reference2Email: '',
            reference3Name: '',
            reference3Phone: '',
            reference3Email: '',
            // Stripe verification
            stripeVerificationSessionId: '',
            stripeVerificationStatus: 'not_started',
            // Consent preferences
            consentToContact: false,
            consentToText: false,
            consentToCall: false,
            communicationPreferences: 'email',
          });
          // Reset to language selection step
          setStep(1);
          setError(null);
          // Clear initial data
          setInitialData(null);
        } else {
          // For other errors, show error state
          setError(errorMessage);
          setStep(-1); // Move to an error step
        }
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationData();
  }, [loanId, loadFromSession, clearSession]);

  // Auto-save form data to sessionStorage when it changes
  useEffect(() => {
    if (step > 0 && step < 9) { // Only save during active form steps
      const timeoutId = setTimeout(() => {
        saveToSession({ ...formData, currentStep: step });
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [formData, step, saveToSession]);

  // Real-time status updates using Supabase Realtime
  useEffect(() => {
    if (!loanId) return;

    let isMounted = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    // Map database verification status to UI status consistently
    const mapVerificationStatus = (dbStatus: string) => {
      if (dbStatus === 'verified') return 'completed';
      return dbStatus;
    };

    // State machine to prevent backwards transitions
    const canTransitionTo = (currentStatus: string, newStatus: string) => {
      const statusOrder = ['pending', 'processing', 'verified', 'completed'];
      const currentIndex = statusOrder.indexOf(currentStatus);
      const newIndex = statusOrder.indexOf(newStatus);
      
      // Allow transitions to same status, forward transitions, or error states
      return newIndex >= currentIndex || newStatus === 'requires_action' || newStatus === 'failed';
    };

    const setupSubscription = async () => {
      // Clean up any existing channel first
      const existingChannels = supabase.getChannels();
      const existingChannel = existingChannels.find(ch => ch.topic === `loan-updates-${loanId}`);
      if (existingChannel) {
        console.log('🧹 Removing existing channel before creating new one');
        await supabase.removeChannel(existingChannel);
      }

      if (!isMounted) return;

      // Set up real-time subscription for loan updates
      channel = supabase
        .channel(`loan-updates-${loanId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'loans',
            filter: `id=eq.${loanId}`
          },
          (payload) => {
            if (!isMounted) return;
            
            console.log('Received loan update:', payload);
            const newRecord = payload.new as {
              phone_verification_status: string;
              verified_phone_number: string;
              stripe_verification_status: string;
              status: string;
            };
            
            // Update phone verification status and verified phone number
            if (newRecord.phone_verification_status || newRecord.verified_phone_number) {
              const phoneStatus = newRecord.phone_verification_status;
              const verifiedPhone = newRecord.verified_phone_number;
              console.log('📱 Phone verification update:', { phoneStatus, verifiedPhone });
              
              setFormData((prev) => {
                const updates: Record<string, unknown> = {};
                
                if (phoneStatus && String(prev.phoneVerificationStatus) !== phoneStatus) {
                  updates.phoneVerificationStatus = phoneStatus;
                }
                
                if (verifiedPhone && String(prev.phoneNumber) !== verifiedPhone) {
                  updates.phoneNumber = verifiedPhone;
                }
                
                if (Object.keys(updates).length > 0) {
                  return { ...prev, ...updates };
                }
                return prev;
              });
            }

            // Update stripe verification status
            if (newRecord.stripe_verification_status) {
              const dbStatus = newRecord.stripe_verification_status;
              const uiStatus = mapVerificationStatus(dbStatus);
              
              setFormData((prev) => {
                const currentStatus = String(prev.stripeVerificationStatus || 'pending');
                if (canTransitionTo(currentStatus, uiStatus) && currentStatus !== uiStatus) {
                  return { ...prev, stripeVerificationStatus: uiStatus };
                }
                return prev;
              });
            }

            // Check for application completion
            if (newRecord.status === 'application_completed' && step !== 9) {
              setStep(9);
            }
          }
        )
        .subscribe((status) => {
          if (!isMounted) return;
          
          console.log('Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to loan updates');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Realtime subscription error');
          } else if (status === 'TIMED_OUT') {
            console.error('⏰ Realtime subscription timed out');
          }
        });
    };

    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      if (channel) {
        console.log('Cleaning up realtime subscription');
        supabase.removeChannel(channel);
      }
    };
  }, [loanId]);

  const saveProgress = async (currentStep: number, data: Record<string, unknown>) => {
    try {
      console.log({ data, currentStep });
      
      // Save to sessionStorage for immediate persistence
      const sessionData = { ...data, currentStep };
      saveToSession(sessionData);
      
      // Also save to database for staff visibility
      await fetch(`/api/apply/${loanId}/save-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, applicationStep: currentStep }),
      });
    } catch (err) {
      console.error("Failed to save progress", err);
    }
  };

  const handleNext = () => {
    const nextStep = step + 1;
    saveProgress(nextStep, formData);
    setStep(nextStep);
  };

  const handlePrev = () => {
    const prevStep = step - 1;
    // Save current form data when going back
    saveToSession({ ...formData, currentStep: prevStep });
    setStep(prevStep);
  };

  const handleLanguageSelection = async (language: Language) => {
    setSelectedLanguage(language);
    
    try {
      // Save language preference to borrower record
      await fetch(`/api/apply/${loanId}/language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      
      // Move to welcome step
      handleNext();
    } catch (err) {
      console.error('Failed to save language preference:', err);
      // Continue anyway - don't block the application
      handleNext();
    }
  };

  const handleSubmit = async () => {
    // Prevent double submissions
    if (isSubmitting || step === 10) {
      console.log('🚫 Preventing double submission - already submitting or completed');
      return;
    }
    
    console.log('🚀 Starting application submission');
    setIsSubmitting(true);
    setLoading(true);
    setError(null);
    try {
      await saveProgress(step, formData); // Save final data
      const response = await fetch(`/api/apply/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to submit application.');
      }
      
      // Clear sessionStorage on successful submission
      clearSession();
      
      // Update the loan status in realtime (will be handled by server response)
      console.log('🎉 Application submitted successfully!');
      
      // Go directly to congratulations page (step 10) - moved after console log for debugging
      console.log('🎯 Setting step to 10 (success page)');
      
      // Use setTimeout to ensure state updates properly
      setTimeout(() => {
        console.log('🎯 Actually setting step to 10 now');
        setStep(10);
      }, 100);
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('💥 Application submission failed:', errorMessage);
      
      // If submission fails due to loan status that indicates it was already completed successfully,
      // just show the success page instead of resetting
      if (errorMessage.includes('already been completed') && errorMessage.includes('application_completed')) {
        console.log('✅ Application was already completed successfully, showing success page');
        setStep(10);
        setError(null);
      } else if (errorMessage.includes('Loan not found') || errorMessage.includes('invalid') || errorMessage.includes('404')) {
        console.log('🔄 Submission failed due to invalid loan state, resetting application...');
        // Clear session storage
        clearSession();
        // Reset form data to initial state
        setFormData({
          // Phone verification
          phoneNumber: '',
          verificationCode: '',
          phoneVerificationStatus: 'pending',
          // Personal details
          dateOfBirth: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          // Employment details
          employmentStatus: '',
          annualIncome: '',
          currentEmployerName: '',
          timeWithEmployment: '',
          // References
          reference1Name: '',
          reference1Phone: '',
          reference1Email: '',
          reference2Name: '',
          reference2Phone: '',
          reference2Email: '',
          reference3Name: '',
          reference3Phone: '',
          reference3Email: '',
          // Stripe verification
          stripeVerificationSessionId: '',
          stripeVerificationStatus: 'not_started',
          // Consent preferences
          consentToContact: false,
          consentToText: false,
          consentToCall: false,
          communicationPreferences: 'email',
        });
        // Reset to language selection step
        setStep(1);
        setError(null);
        // Clear initial data
        setInitialData(null);
      } else {
        // For other errors, show the error but stay in current state
        setError(errorMessage);
      }
    } finally {
      console.log('🔄 handleSubmit finally block: setting loading to false');
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, name: 'Language Selection', component: LanguageSelectionStepInternal },
    { id: 2, name: 'Welcome', component: WelcomeStep },
    { id: 3, name: 'Phone Verification', component: PhoneVerificationStep },
    { id: 4, name: 'Personal Information', component: PersonalDetailsStep },
    { id: 5, name: 'Employment Details', component: EmploymentDetailsStep },
    { id: 6, name: 'References', component: ReferencesStep },
    { id: 7, name: 'Identity Verification', component: StripeVerificationStep },
    { id: 8, name: 'Consent & Preferences', component: ConsentStep },
    { id: 9, name: 'Review & Submit', component: ReviewStep },
  ];

  const CurrentStepComponent = steps.find(s => s.id === step)?.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl">
        {/* Header and Step Indicator */}
        {step > 1 && step <= 9 && (
          <div className="mb-8">
            <p className="text-sm font-semibold text-purple-600">Step {step - 1} of {steps.length - 1}</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/30 p-6 md:p-8 w-full"
          >
            {loading && step === 0 && <Loader text={getTranslations(selectedLanguage).loading.application} />}
            {error && step === -1 && <ErrorMessage error={error} selectedLanguage={selectedLanguage} />}
            
            {CurrentStepComponent && (
              <CurrentStepComponent
                formData={formData}
                setFormData={setFormData}
                initialData={initialData}
                handleNext={handleNext}
                handlePrev={handlePrev}
                handleSubmit={handleSubmit}
                handleLanguageSelection={handleLanguageSelection}
                selectedLanguage={selectedLanguage}
                loading={loading}
                isSubmitting={isSubmitting}
                saveProgress={saveProgress}
              />
            )}

            {step === 10 && <SuccessMessage selectedLanguage={selectedLanguage} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Step 2: Phone Verification
function PhoneVerificationStep({ formData, setFormData, initialData, handleNext, handlePrev, selectedLanguage }: { 
  formData: Record<string, unknown>; 
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>; 
  initialData: LoanApplicationData | null;
  handleNext: () => void; 
  handlePrev: () => void; 
  selectedLanguage: Language;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showOTPInput, setShowOTPInput] = useState(false);

  const phoneNumber = String(formData.phoneNumber || '');
  const verificationCode = String(formData.verificationCode || '');
  const verificationStatus = String(formData.phoneVerificationStatus || 'pending');
  
  const t = getTranslations(selectedLanguage);

  const sendVerificationCode = async () => {
    if (!phoneNumber.trim()) {
      setError(t.phoneVerification.error.enterPhone);
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/twilio/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          loanId: initialData?.loanId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification code');
      }

      setFormData(prev => ({ 
        ...prev, 
        phoneNumber: data.phoneNumber,
        phoneVerificationStatus: 'sent' 
      }));
      setSuccessMessage(t.phoneVerification.otpSent);
      setIsEditing(false);
      setShowOTPInput(true);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t.phoneVerification.error.sendFailed;
      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = useCallback(async () => {
    if (!verificationCode.trim() || verificationCode.length < 6) {
      setError(t.phoneVerification.error.enterCompleteCode);
      return;
    }

    setIsVerifying(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/twilio/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          code: verificationCode.trim(),
          loanId: initialData?.loanId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }

      if (data.success && data.status === 'approved') {
        setFormData(prev => ({ 
          ...prev, 
          phoneVerificationStatus: 'verified',
          verificationCode: '' 
        }));
        setSuccessMessage(t.phoneVerification.verifiedMessage);
        setShowOTPInput(false);
      } else {
        setError(t.phoneVerification.error.invalidCode);
        // Clear the code so user can try again
        setFormData(prev => ({ ...prev, verificationCode: '' }));
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t.phoneVerification.error.verifyFailed;
      setError(errorMessage);
      // Clear the code so user can try again
      setFormData(prev => ({ ...prev, verificationCode: '' }));
    } finally {
      setIsVerifying(false);
    }
  }, [verificationCode, initialData?.loanId, phoneNumber, setFormData, t.phoneVerification.error.enterCompleteCode, t.phoneVerification.error.invalidCode, t.phoneVerification.verifiedMessage, t.phoneVerification.error.verifyFailed]);

  // Auto-verify when code is complete
  useEffect(() => {
    if (verificationCode.length === 6 && showOTPInput && verificationStatus !== 'verified' && !isVerifying) {
      verifyCode();
    }
  }, [verificationCode, showOTPInput, verificationStatus, isVerifying, verifyCode]);


  // Case 1: Phone number is verified - show success screen
  if (verificationStatus === 'verified') {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.phoneVerification.verified}</h1>
          <p className="text-gray-600">{t.phoneVerification.verifiedMessage}</p>
          <p className="text-lg font-medium text-gray-800 mt-4">{phoneNumber}</p>
        </div>

        <div className="mt-10 flex justify-center">
          <button 
            onClick={handleNext} 
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center"
          >
            Continue <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </div>
      </div>
    );
  }

  // Case 2: OTP input screen - when code has been sent
  if ((verificationStatus === 'sent' || showOTPInput) && phoneNumber && !isEditing) {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">OTP Verification</h1>
          <p className="text-gray-600 mb-2">Enter the OTP sent to</p>
          <p className="text-lg font-medium text-gray-800">{phoneNumber}</p>
        </div>

        <div className="space-y-6">
          <OTPInput 
            value={verificationCode}
            onChange={(value) => setFormData({...formData, verificationCode: value})}
            disabled={isVerifying}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-green-700 text-sm">{successMessage}</span>
              </div>
            </div>
          )}

          <div className="text-center">
            <p className="text-gray-600 text-sm">
              {t.phoneVerification.otpNotReceived}
              <button
                onClick={sendVerificationCode}
                disabled={isSending}
                className="text-purple-600 hover:text-purple-700 font-medium ml-1 disabled:opacity-50"
              >
                {isSending ? t.phoneVerification.resending : t.phoneVerification.otpResend}
              </button>
            </p>
          </div>

          <button
            onClick={verifyCode}
            disabled={isVerifying || verificationCode.length < 6}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                {t.phoneVerification.verifying}
              </>
            ) : (
              t.phoneVerification.verify
            )}
          </button>
        </div>

        <div className="mt-10 flex justify-between">
          <button 
            onClick={() => {
              setIsEditing(true);
              setShowOTPInput(false);
              setFormData(prev => ({ ...prev, verificationCode: '' }));
            }} 
            className="px-8 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 shadow-sm"
          >
            {t.phoneVerification.changeNumber}
          </button>
        </div>
      </div>
    );
  }

  // Case 3: Phone number entry screen - default state or editing
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Phone className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.phoneVerification.title}</h1>
        <p className="text-gray-600">{t.phoneVerification.subtitle}</p>
      </div>

      <div className="space-y-6">
        <InputField
          icon={<Phone />}
          label={t.phoneVerification.phoneLabel}
          name="phoneNumber"
          type="tel"
          placeholder={t.phoneVerification.phonePlaceholder}
          value={phoneNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            setFormData({...formData, phoneNumber: e.target.value})
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        <button
          onClick={sendVerificationCode}
          disabled={isSending || !phoneNumber.trim()}
          className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {t.phoneVerification.sending}
            </>
          ) : (
            t.phoneVerification.getOtp
          )}
        </button>
      </div>

      <div className="mt-10 flex justify-start">
        <button 
          onClick={handlePrev} 
          className="px-8 py-3 bg-white/60 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all duration-300 shadow-sm"
        >
          {t.phoneVerification.back}
        </button>
      </div>
    </div>
  );
}

// Step 2: Welcome
function WelcomeStep({ initialData, handleNext, selectedLanguage }: { 
  initialData: LoanApplicationData | null; 
  handleNext: () => void;
  selectedLanguage: Language;
}) {
  const t = getTranslations(selectedLanguage);
  
  return (
    <div className="text-center py-8">
      <div className="text-center mb-8">
        <Image 
          src="/logoMain.png" 
          alt="iPayUS Logo" 
          width={150} 
          height={150}
          className="rounded-2xl shadow-lg mx-auto"
        />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
        {interpolate(t.welcome.title, { name: initialData?.borrower.first_name || '' })}
      </h1>
      <p className="text-gray-600 text-base md:text-lg max-w-md mx-auto mb-8">{t.welcome.subtitle}</p>
      <button onClick={handleNext} className="w-full md:w-auto md:mx-auto px-10 py-5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center text-lg">
        {t.welcome.getStarted} <ArrowRight className="w-6 h-6 ml-3" />
      </button>
    </div>
  );
}

// Step 3: Personal Details
function PersonalDetailsStep({ formData, setFormData, initialData, handleNext, handlePrev, selectedLanguage }: { 
  formData: Record<string, unknown>; 
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>; 
  initialData: LoanApplicationData | null; 
  handleNext: () => void; 
  handlePrev: () => void; 
  selectedLanguage: Language;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const t = getTranslations(selectedLanguage);

  // Validation function
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Date of birth validation
    if (!formData.dateOfBirth || String(formData.dateOfBirth).trim() === '') {
      newErrors.dateOfBirth = t.personalDetails.validation.dobRequired;
    } else {
      const dob = new Date(String(formData.dateOfBirth));
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 18 || age > 100) {
        newErrors.dateOfBirth = t.personalDetails.validation.ageRequirement;
      }
    }

    // Address validation
    if (!formData.address || String(formData.address).trim() === '') {
      newErrors.address = t.personalDetails.validation.addressRequired;
    } else if (String(formData.address).trim().length < 5) {
      newErrors.address = t.personalDetails.validation.addressMinLength;
    }

    // City validation
    if (!formData.city || String(formData.city).trim() === '') {
      newErrors.city = t.personalDetails.validation.cityRequired;
    } else if (String(formData.city).trim().length < 2) {
      newErrors.city = t.personalDetails.validation.cityMinLength;
    }

    // State validation
    if (!formData.state || String(formData.state).trim() === '') {
      newErrors.state = t.personalDetails.validation.stateRequired;
    } else if (String(formData.state).trim().length < 2) {
      newErrors.state = t.personalDetails.validation.stateMinLength;
    }

    // ZIP code validation
    if (!formData.zipCode || String(formData.zipCode).trim() === '') {
      newErrors.zipCode = t.personalDetails.validation.zipRequired;
    } else {
      const zipCode = String(formData.zipCode).trim();
      const zipRegex = /^\d{5}(-\d{4})?$/;
      if (!zipRegex.test(zipCode)) {
        newErrors.zipCode = t.personalDetails.validation.zipInvalid;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextClick = () => {
    if (validateForm()) {
      handleNext();
    }
  };
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t.personalDetails.title}</h1>
      <p className="text-gray-600 mb-8">{t.personalDetails.subtitle}</p>
      
      <div className="space-y-6">
        {/* Pre-filled, non-changeable fields */}
        <div className="grid md:grid-cols-2 gap-6">
          <InfoField icon={<User />} label={t.personalDetails.fullName} value={`${initialData?.borrower.first_name} ${initialData?.borrower.last_name}`} />
          <InfoField icon={<DollarSign />} label={t.personalDetails.loanAmount} value={`$${initialData?.loan.principal_amount.toLocaleString()}`} />
          {initialData?.borrower.email && (
            <InfoField icon={<Mail />} label={t.personalDetails.email} value={initialData.borrower.email} />
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t.personalDetails.verifiedPhone}</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400">
                <Phone />
              </div>
              <div className="w-full pl-12 pr-12 py-3 bg-green-50 border border-green-200 rounded-2xl text-gray-700 font-medium flex items-center justify-between">
                <span>{String(formData.phoneNumber || initialData?.borrower.phone || '')}</span>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Vehicle and Dealer Information */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">{t.personalDetails.loanDetails}</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <InfoField label={t.personalDetails.dealer} value={initialData?.dealerName} icon={undefined} />
            <InfoField label={t.personalDetails.vehicleYear} value={initialData?.loan.vehicleYear} icon={undefined} />
            <InfoField label={t.personalDetails.vehicleMake} value={initialData?.loan.vehicleMake} icon={undefined} />
            <InfoField label={t.personalDetails.vehicleModel} value={initialData?.loan.vehicleModel} icon={undefined} />
            <InfoField label={t.personalDetails.vehicleVin} value={initialData?.loan.vehicleVin} icon={undefined} />
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Form fields */}
        <InputFieldWithError 
          icon={<Calendar />} 
          label={t.personalDetails.dateOfBirth} 
          name="dateOfBirth" 
          type="date" 
          value={formData.dateOfBirth} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, dateOfBirth: e.target.value})}
          error={errors.dateOfBirth}
        />
        <InputFieldWithError 
          label={t.personalDetails.address} 
          name="address" 
          type="text" 
          placeholder="123 Main Street"
          value={formData.address} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address: e.target.value })} 
          error={errors.address}
        />
        <div className="grid md:grid-cols-3 gap-4">
          <InputFieldWithError 
            label={t.personalDetails.city} 
            name="city" 
            type="text" 
            placeholder="Miami"
            value={formData.city} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, city: e.target.value })} 
            error={errors.city}
          />
          <InputFieldWithError 
            label={t.personalDetails.state} 
            name="state" 
            type="text" 
            placeholder="FL"
            value={formData.state} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, state: e.target.value })} 
            error={errors.state}
          />
          <InputFieldWithError 
            label={t.personalDetails.zipCode} 
            name="zipCode" 
            type="text" 
            placeholder="33101"
            value={formData.zipCode} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, zipCode: e.target.value })} 
            error={errors.zipCode}
          />
        </div>
      </div>

      <div className="mt-10 flex flex-col-reverse md:flex-row md:justify-between gap-4">
        <button 
          onClick={handlePrev} 
          className="w-full md:w-auto px-8 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-700 font-semibold hover:bg-white/80 hover:shadow-lg transition-all duration-300 shadow-sm justify-center"
        >
          {t.personalDetails.back}
        </button>
        <button 
          onClick={handleNextClick} 
          className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center"
        >
          {t.personalDetails.next} <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}

// Step 4: Employment Details
function EmploymentDetailsStep({ formData, setFormData, handleNext, handlePrev, selectedLanguage }: { 
  formData: Record<string, unknown>; 
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>; 
  handleNext: () => void; 
  handlePrev: () => void; 
  selectedLanguage: Language;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const t = getTranslations(selectedLanguage);

  // Validation function
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Employment status validation
    if (!formData.employmentStatus || String(formData.employmentStatus).trim() === '') {
      newErrors.employmentStatus = t.employment.validation.statusRequired;
    }

    // Annual income validation
    if (!formData.annualIncome || String(formData.annualIncome).trim() === '') {
      newErrors.annualIncome = t.employment.validation.incomeRequired;
    } else {
      const income = parseFloat(String(formData.annualIncome));
      if (isNaN(income) || income <= 0) {
        newErrors.annualIncome = t.employment.validation.incomeInvalid;
      } else if (income < 1000) {
        newErrors.annualIncome = t.employment.validation.incomeMinimum;
      } else if (income > 10000000) {
        newErrors.annualIncome = t.employment.validation.incomeMaximum;
      }
    }

    // Employer name validation (required for employed/self-employed)
    const employmentStatus = String(formData.employmentStatus);
    if (employmentStatus === 'employed' || employmentStatus === 'self_employed') {
      if (!formData.currentEmployerName || String(formData.currentEmployerName).trim() === '') {
        newErrors.currentEmployerName = t.employment.validation.employerRequired;
      } else if (String(formData.currentEmployerName).trim().length < 2) {
        newErrors.currentEmployerName = t.employment.validation.employerMinLength;
      }

      // Time with employment validation (required for employed/self-employed)
      if (!formData.timeWithEmployment || String(formData.timeWithEmployment).trim() === '') {
        newErrors.timeWithEmployment = t.employment.validation.timeRequired;
      } else if (String(formData.timeWithEmployment).trim().length < 2) {
        newErrors.timeWithEmployment = t.employment.validation.timeMinLength;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextClick = () => {
    if (validateForm()) {
      handleNext();
    }
  };

  const employmentStatus = String(formData.employmentStatus || 'employed');
  const showEmployerFields = employmentStatus === 'employed' || employmentStatus === 'self_employed';
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t.employment.title}</h1>
      <p className="text-gray-600 mb-8">{t.employment.subtitle}</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t.employment.employmentStatus}</label>
          <CustomSelect
            options={[
              { value: 'employed', label: t.employment.employmentOptions.employed },
              { value: 'self_employed', label: t.employment.employmentOptions.selfEmployed },
              { value: 'unemployed', label: t.employment.employmentOptions.unemployed },
              { value: 'retired', label: t.employment.employmentOptions.retired },
              { value: 'student', label: t.employment.employmentOptions.student },
            ]}
            value={formData.employmentStatus as string}
            onChange={(value) => setFormData({...formData, employmentStatus: value})}
            placeholder={t.employment.employmentStatus}
          />
          {errors.employmentStatus && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.employmentStatus}
            </p>
          )}
        </div>

        <InputFieldWithError 
          label={t.employment.annualIncome} 
          name="annualIncome" 
          type="number" 
          placeholder="50000" 
          value={formData.annualIncome} 
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, annualIncome: e.target.value })} 
          error={errors.annualIncome}
        />

        {showEmployerFields && (
          <>
            <InputFieldWithError 
              label={employmentStatus === 'self_employed' ? t.employment.businessName : t.employment.currentEmployer} 
              name="currentEmployerName" 
              type="text" 
              placeholder={employmentStatus === 'self_employed' ? t.employment.businessName : t.employment.currentEmployer}
              value={formData.currentEmployerName} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, currentEmployerName: e.target.value })} 
              error={errors.currentEmployerName}
            />
            <InputFieldWithError 
              label={t.employment.timeWithEmployment} 
              name="timeWithEmployment" 
              type="text" 
              placeholder="e.g., 2 years, 6 months, 1.5 years" 
              value={formData.timeWithEmployment} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, timeWithEmployment: e.target.value })} 
              error={errors.timeWithEmployment}
            />
          </>
        )}

        {!showEmployerFields && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">{t.employment.additionalInfo.title}</h3>
                <p className="text-blue-800 text-sm">
                  {employmentStatus === 'unemployed' && t.employment.additionalInfo.unemployed}
                  {employmentStatus === 'retired' && t.employment.additionalInfo.retired}
                  {employmentStatus === 'student' && t.employment.additionalInfo.student}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-col-reverse md:flex-row md:justify-between gap-4">
        <button onClick={handlePrev} className="w-full md:w-auto px-8 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-700 font-semibold hover:bg-white/80 hover:shadow-lg transition-all duration-300 shadow-sm justify-center">{t.employment.back}</button>
        <button 
          onClick={handleNextClick} 
          className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center"
        >
          {t.employment.next} <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}

// Step 5: Review (Modified - added new employment fields)
function ReviewStep({ formData, initialData, handlePrev, handleSubmit, loading, isSubmitting, selectedLanguage }: { 
  formData: Record<string, unknown>; 
  initialData: LoanApplicationData | null; 
  handlePrev: () => void; 
  handleSubmit: () => void; 
  loading: boolean; 
  isSubmitting: boolean;
  selectedLanguage: Language;
}) {
  const reviewData = {
    ...initialData?.borrower,
    ...initialData?.loan,
    ...formData
  };
  const t = getTranslations(selectedLanguage);

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t.review.title}</h1>
      <p className="text-gray-600 mb-8">{t.review.subtitle}</p>
      
      <div className="space-y-6 bg-gray-50/50 p-4 md:p-6 rounded-2xl border">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">{t.review.basicInfo}</h3>
          <div className="space-y-2">
            <ReviewItem label={t.review.fullName} value={`${reviewData.first_name || ''} ${reviewData.last_name || ''}`} />
            <ReviewItem label={t.review.email} value={reviewData.email || t.common.notProvided} />
            <ReviewItem label={t.review.verifiedPhone} value={`✅ ${(reviewData as Record<string, unknown>).phoneNumber as string || reviewData.phone || t.common.notProvided}`} />
            <ReviewItem label={t.review.dateOfBirth} value={(reviewData as Record<string, unknown>).dateOfBirth as string || t.common.notProvided} />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Address Information */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">{t.review.address}</h3>
          <div className="space-y-2">
            <ReviewItem label={t.review.streetAddress} value={(reviewData as Record<string, unknown>).address as string || t.common.notProvided} />
            <ReviewItem label={t.review.city} value={(reviewData as Record<string, unknown>).city as string || t.common.notProvided} />
            <ReviewItem label={t.review.state} value={(reviewData as Record<string, unknown>).state as string || t.common.notProvided} />
            <ReviewItem label={t.review.zipCode} value={(reviewData as Record<string, unknown>).zipCode as string || t.common.notProvided} />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Loan Information */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">{t.review.loanInfo}</h3>
          <div className="space-y-2">
            <ReviewItem label={t.review.loanAmount} value={`$${reviewData.principal_amount?.toLocaleString() || 'N/A'}`} />
            <ReviewItem label={t.review.dealer} value={initialData?.dealerName || t.common.notProvided} />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Vehicle Information */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">{t.review.vehicleInfo}</h3>
          <div className="space-y-2">
            <ReviewItem label={t.review.year} value={reviewData.vehicleYear || initialData?.loan?.vehicleYear || t.common.notProvided} />
            <ReviewItem label={t.review.make} value={reviewData.vehicleMake || initialData?.loan?.vehicleMake || t.common.notProvided} />
            <ReviewItem label={t.review.model} value={reviewData.vehicleModel || initialData?.loan?.vehicleModel || t.common.notProvided} />
            <ReviewItem label={t.review.vin} value={reviewData.vehicleVin || initialData?.loan?.vehicleVin || t.common.notProvided} />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Employment Information */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">{t.review.employmentInfo}</h3>
          <div className="space-y-2">
            <ReviewItem label={t.review.employmentStatus} value={(reviewData as Record<string, unknown>).employmentStatus as string || t.common.notProvided} />
            <ReviewItem label={t.review.annualIncome} value={(reviewData as Record<string, unknown>).annualIncome ? `$${parseFloat((reviewData as Record<string, unknown>).annualIncome as string).toLocaleString()}` : t.common.notProvided} />
            <ReviewItem label={t.review.currentEmployer} value={(reviewData as Record<string, unknown>).currentEmployerName as string || t.common.notProvided} />
            <ReviewItem label={t.review.timeWithEmployment} value={(reviewData as Record<string, unknown>).timeWithEmployment as string || t.common.notProvided} />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* References */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">{t.review.references}</h3>
          <div className="space-y-4">
            {/* Reference 1 */}
            {((reviewData as Record<string, unknown>).reference1Name || (reviewData as Record<string, unknown>).reference1Phone || (reviewData as Record<string, unknown>).reference1Email) ? (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">{t.review.reference} 1</h4>
                <div className="ml-4 space-y-1">
                  {(reviewData as Record<string, unknown>).reference1Name ? <ReviewItem label={t.review.name} value={(reviewData as Record<string, unknown>).reference1Name as string} /> : null}
                  {(reviewData as Record<string, unknown>).reference1Phone ? <ReviewItem label={t.review.phone} value={(reviewData as Record<string, unknown>).reference1Phone as string} /> : null}
                  {(reviewData as Record<string, unknown>).reference1Email ? <ReviewItem label="Email" value={(reviewData as Record<string, unknown>).reference1Email as string} /> : null}
                </div>
              </div>
            ) : null}
            
            {/* Reference 2 */}
            {((reviewData as Record<string, unknown>).reference2Name || (reviewData as Record<string, unknown>).reference2Phone || (reviewData as Record<string, unknown>).reference2Email) ? (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">{t.review.reference} 2</h4>
                <div className="ml-4 space-y-1">
                  {(reviewData as Record<string, unknown>).reference2Name ? <ReviewItem label={t.review.name} value={(reviewData as Record<string, unknown>).reference2Name as string} /> : null}
                  {(reviewData as Record<string, unknown>).reference2Phone ? <ReviewItem label={t.review.phone} value={(reviewData as Record<string, unknown>).reference2Phone as string} /> : null}
                  {(reviewData as Record<string, unknown>).reference2Email ? <ReviewItem label="Email" value={(reviewData as Record<string, unknown>).reference2Email as string} /> : null}
                </div>
              </div>
            ) : null}
            
            {/* Reference 3 */}
            {((reviewData as Record<string, unknown>).reference3Name || (reviewData as Record<string, unknown>).reference3Phone || (reviewData as Record<string, unknown>).reference3Email) ? (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">{t.review.reference} 3</h4>
                <div className="ml-4 space-y-1">
                  {(reviewData as Record<string, unknown>).reference3Name ? <ReviewItem label={t.review.name} value={(reviewData as Record<string, unknown>).reference3Name as string} /> : null}
                  {(reviewData as Record<string, unknown>).reference3Phone ? <ReviewItem label={t.review.phone} value={(reviewData as Record<string, unknown>).reference3Phone as string} /> : null}
                  {(reviewData as Record<string, unknown>).reference3Email ? <ReviewItem label="Email" value={(reviewData as Record<string, unknown>).reference3Email as string} /> : null}
                </div>
              </div>
            ) : null}
            
            {!(reviewData as Record<string, unknown>).reference1Name && !(reviewData as Record<string, unknown>).reference1Phone && !(reviewData as Record<string, unknown>).reference1Email &&
             !(reviewData as Record<string, unknown>).reference2Name && !(reviewData as Record<string, unknown>).reference2Phone && !(reviewData as Record<string, unknown>).reference2Email &&
             !(reviewData as Record<string, unknown>).reference3Name && !(reviewData as Record<string, unknown>).reference3Phone && !(reviewData as Record<string, unknown>).reference3Email ? (
              <p className="text-gray-500 italic">{t.review.noReferences}</p>
            ) : null}
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Verification & Consent */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">{t.review.verificationConsent}</h3>
          <div className="space-y-2">
            <ReviewItem 
              label={t.review.identityVerification} 
              value={(reviewData as Record<string, unknown>).stripeVerificationStatus === 'completed' ? t.review.verified : t.review.pending} 
            />
            <ReviewItem label={t.review.communicationConsent} value={(reviewData as Record<string, unknown>).consentToContact ? t.review.yes : t.review.no} />
            {(reviewData as Record<string, unknown>).consentToText ? <ReviewItem label={t.review.textConsent} value={t.review.yes} /> : null}
            {(reviewData as Record<string, unknown>).consentToCall ? <ReviewItem label={t.review.phoneConsent} value={t.review.yes} /> : null}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col-reverse md:flex-row md:justify-between gap-4">
        <button onClick={handlePrev} className="w-full md:w-auto px-8 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-700 font-semibold hover:bg-white/80 hover:shadow-lg transition-all duration-300 shadow-sm justify-center">{t.review.back}</button>
        <button onClick={handleSubmit} disabled={loading || isSubmitting} className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-50">
          {(loading || isSubmitting) ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />} {(loading || isSubmitting) ? t.review.submitting : t.review.submitApplication}
        </button>
      </div>
    </div>
  );
}

// --- UI Components ---
const InputField = ({ icon, label, ...props }: { icon?: React.ReactNode; label: string; [key: string]: unknown }) => (
  <div>
    <label htmlFor={props.name as string} className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <div className="relative">
      {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400">{icon}</div>}
      <input 
        {...props} 
        id={props.name as string} 
        value={props.value != null ? String(props.value) : ''} // Convert null/undefined/NaN to empty string
        className={`w-full py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300 ${icon ? 'pl-12 pr-4' : 'px-4'} ${props.type === 'date' ? 'appearance-none' : ''}`} 
      />
    </div>
  </div>
);

const InputFieldWithError = ({ icon, label, error, ...props }: { 
  icon?: React.ReactNode; 
  label: string; 
  error?: string;
  [key: string]: unknown;
}) => (
  <div>
    <label htmlFor={props.name as string} className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <div className="relative">
      {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400">{icon}</div>}
      <input 
        {...props} 
        id={props.name as string} 
        value={props.value != null ? String(props.value) : ''} // Convert null/undefined/NaN to empty string
        className={`w-full py-3 border rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:outline-none transition-all duration-300 ${icon ? 'pl-12 pr-4' : 'px-4'} ${props.type === 'date' ? 'appearance-none' : ''} ${
          error 
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-200 focus:ring-purple-500 focus:border-purple-500'
        }`} 
      />
    </div>
    {error && (
      <p className="mt-2 text-sm text-red-600 flex items-center">
        <AlertCircle className="w-4 h-4 mr-1" />
        {error}
      </p>
    )}
  </div>
);

const InfoField = ({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string | undefined }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400">{icon}</div>
      <div className="w-full pl-12 pr-4 py-3 bg-gray-100/80 border border-gray-200 rounded-2xl text-gray-700 font-medium">
        {value}
      </div>
    </div>
  </div>
);

const ReviewItem = ({ label, value }: { label: string; value: string | undefined }) => (
  <div className="flex justify-between items-center py-2 text-sm md:text-base">
    <p className="text-gray-600">{label}</p>
    <p className="font-semibold text-gray-900 text-right">{value}</p>
  </div>
);

const Loader = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center py-20">
    <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
    <p className="text-gray-600 font-medium">{text}</p>
  </div>
);

const ErrorMessage = ({ error, selectedLanguage = 'en' }: { error: string; selectedLanguage?: Language }) => {
  const t = getTranslations(selectedLanguage);
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.error.title}</h2>
      <p className="text-gray-600">{error}</p>
    </div>
  );
};

// Step 1: Language Selection
function LanguageSelectionStepInternal({ handleLanguageSelection }: { 
  handleLanguageSelection: (language: Language) => void;
}) {
  const t = getTranslations('en'); // Always show in English for language selection

  return (
    <div className="text-center py-8">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Globe className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{t.languageSelection.title}</h1>
        <p className="text-gray-600 text-base md:text-lg max-w-md mx-auto mb-8">{t.languageSelection.subtitle}</p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <button
          onClick={() => handleLanguageSelection('en')}
          className="w-full px-8 py-4 bg-white border-2 border-gray-200 rounded-2xl text-gray-900 font-semibold hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-between"
        >
          <span className="text-lg">{t.languageSelection.english}</span>
          <span className="text-2xl">🇺🇸</span>
        </button>
        
        <button
          onClick={() => handleLanguageSelection('es')}
          className="w-full px-8 py-4 bg-white border-2 border-gray-200 rounded-2xl text-gray-900 font-semibold hover:border-purple-500 hover:bg-purple-50 transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-between"
        >
          <span className="text-lg">{t.languageSelection.spanish}</span>
          <span className="text-2xl">🇲🇽</span>
        </button>
      </div>
    </div>
  );
}

const SuccessMessage = ({ selectedLanguage = 'en' }: { selectedLanguage?: Language }) => {
  const t = getTranslations(selectedLanguage);
  
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Check className="w-10 h-10 text-green-500" />
      </div>
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t.success.title}</h2>
      <h3 className="text-xl md:text-2xl font-semibold text-green-600 mb-6">{t.success.subtitle}</h3>
      
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-green-800 mb-3">{t.success.whatNext}</h4>
          <div className="space-y-3 text-left">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-700 text-sm font-bold">1</span>
              </div>
              <p className="text-green-700">{t.success.step1}</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-700 text-sm font-bold">2</span>
              </div>
              <p className="text-green-700">{t.success.step2}</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-700 text-sm font-bold">3</span>
              </div>
              <p className="text-green-700">{t.success.step3}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-blue-800 mb-3">{t.success.importantInfo}</h4>
          <div className="space-y-2 text-left text-blue-700">
            {t.success.info.map((item, index) => (
              <p key={index}>• {item}</p>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">{t.success.questions}</h4>
          <p className="text-gray-600">{t.success.questionsText}</p>
        </div>
      </div>
    </div>
  );
};

// New Step: References
function ReferencesStep({ formData, setFormData, handleNext, handlePrev, selectedLanguage }: { 
  formData: Record<string, unknown>; 
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>; 
  handleNext: () => void; 
  handlePrev: () => void; 
  selectedLanguage: Language;
}) {
  const t = getTranslations(selectedLanguage);
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t.references.title}</h1>
      <p className="text-gray-600 mb-8">{t.references.subtitle}</p>

      <div className="space-y-8">
        {[1, 2, 3].map((num) => (
          <div key={num} className="p-4 border border-gray-200 rounded-2xl bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{t.references.reference} {num}</h3>
            <div className="space-y-4">
              <InputField label={t.references.name} name={`reference${num}Name`} type="text" value={formData[`reference${num}Name`]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [`reference${num}Name`]: e.target.value})} />
              <InputField label={t.references.phone} name={`reference${num}Phone`} type="text" value={formData[`reference${num}Phone`]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [`reference${num}Phone`]: e.target.value})} />
              <InputField label={t.references.email} name={`reference${num}Email`} type="email" value={formData[`reference${num}Email`]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [`reference${num}Email`]: e.target.value})} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col-reverse md:flex-row md:justify-between gap-4">
        <button onClick={handlePrev} className="w-full md:w-auto px-8 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-700 font-semibold hover:bg-white/80 hover:shadow-lg transition-all duration-300 shadow-sm justify-center">{t.references.back}</button>
        <button onClick={handleNext} className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center">
          {t.references.next} <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}

// Step 5: Stripe Identity Verification
function StripeVerificationStep({ formData, setFormData, initialData, handleNext, handlePrev, saveProgress, selectedLanguage }: { 
  formData: Record<string, unknown>; 
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>; 
  initialData: LoanApplicationData | null; 
  handleNext: () => void; 
  handlePrev: () => void; 
  saveProgress: (step: number, data: Record<string, unknown>) => void; 
  selectedLanguage: Language;
}) {
  const [verificationStatus, setVerificationStatus] = useState(formData.stripeVerificationStatus || 'not_started'); // not_started, in_progress, completed, failed
  const [isVerifying, setIsVerifying] = useState(false);
  const [stripe, setStripe] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = getTranslations(selectedLanguage);

  useEffect(() => {
    // Load Stripe.js
    const loadStripe = async () => {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      console.log('🔑 Stripe publishable key:', publishableKey ? 'Found' : 'Missing');
      
      if (!publishableKey) {
        setError('Stripe publishable key not found. Please check your environment configuration.');
        return;
      }
      
      if (window.Stripe) {
        setStripe(window.Stripe(publishableKey));
      } else {
        // Add Stripe.js script if not already loaded
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = () => {
          setStripe(window.Stripe(publishableKey));
        };
        document.head.appendChild(script);
      }
    };
    
    loadStripe();
  }, []);

  useEffect(() => {
    const newStatus = formData.stripeVerificationStatus || 'not_started';
    console.log('🔄 StripeVerificationStep: Updating local status to:', newStatus);
    setVerificationStatus(newStatus);
  }, [formData.stripeVerificationStatus]);

  const handleSkipVerification = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      const response = await fetch(`/api/apply/${initialData?.loanId}/skip-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: initialData?.loanId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to skip verification.');
      }

      // Update through formData only, not local state
      setFormData({
        ...formData,
        stripeVerificationStatus: 'completed',
      });
    } catch (err: unknown) {
      console.error('Error skipping verification:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const startVerification = async () => {
    if (!stripe) {
      setError('Stripe is not loaded yet. Please try again.');
      return;
    }

    setIsVerifying(true);
    setError(null);
    // Don't set verificationStatus here - let it be controlled by formData.stripeVerificationStatus
    
    try {
      // Create verification session on the server
      const response = await fetch('/api/stripe/create-verification-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: initialData?.borrower.email,
          firstName: initialData?.borrower.first_name,
          lastName: initialData?.borrower.last_name,
          loanId: initialData?.loanId || 'unknown'
        }),
      });

      const session = await response.json();

      if (!response.ok) {
        throw new Error(session.error || 'Failed to create verification session');
      }

      // Save the session ID to the database
      await saveProgress(5, { ...formData, stripeVerificationSessionId: session.verification_session_id });
      setFormData({ ...formData, stripeVerificationSessionId: session.verification_session_id });

      // Show the verification modal using Stripe.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (stripe as any).verifyIdentity(session.client_secret);

      if (result.error) {
        // Handle verification errors
        console.error('Verification error:', result.error);
        // Don't set verificationStatus here directly - update through formData
        
        // Handle various error message formats
        let errorMessage = 'Verification failed. Please try again.';
        if (result.error.message) {
          errorMessage = result.error.message;
        } else if (result.error.type) {
          errorMessage = `Verification failed: ${result.error.type}`;
        } else if (typeof result.error === 'string') {
          errorMessage = result.error;
        }
        
        setError(errorMessage);
        setFormData({...formData, stripeVerificationStatus: 'failed'});
      } else {
        // Verification was submitted successfully to Stripe
        // Don't set status here - let webhook handle the actual verification result
        // The realtime subscription will update the status based on webhook events
        console.log('Verification submitted. Waiting for webhook updates...');
        console.log('🎯 Stripe verification modal completed successfully');
      }
    } catch (error) {
      console.error('Error starting verification:', error);
      // Don't set verificationStatus here directly - update through formData
      
      // Handle error message safely
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMessage = (error as any)?.message || (error as any)?.toString() || 'An unexpected error occurred during verification';
      setError(errorMessage);
      setFormData({...formData, stripeVerificationStatus: 'failed'});
    } finally {
      setIsVerifying(false);
    }
  };

  const canProceed = verificationStatus === 'completed';

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t.identityVerification.title}</h1>
      <p className="text-gray-600 mb-8">{t.identityVerification.subtitle}</p>

      <div className="space-y-6">
        {/* Information Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <Lock className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">{t.identityVerification.secureTitle}</h3>
              <ul className="text-blue-800 text-sm space-y-2">
                {t.identityVerification.secureList.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Verification Status */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-center">
            {(verificationStatus === 'not_started' || verificationStatus === 'pending' || verificationStatus === 'requires_action' || verificationStatus === 'canceled' || verificationStatus === 'unverified') && (
              <div>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t.identityVerification.readyTitle}</h3>
                <p className="text-gray-600 mb-6">{t.identityVerification.readySubtitle}</p>
                <button
                  onClick={startVerification}
                  disabled={isVerifying}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {t.identityVerification.startVerification}
                </button>
                <button
                  onClick={handleSkipVerification}
                  disabled={isVerifying}
                  className="mt-4 px-8 py-4 bg-gray-300 text-gray-800 rounded-2xl font-semibold hover:bg-gray-400 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {t.identityVerification.skipVerification}
                </button>
              </div>
            )}

            {verificationStatus === 'in_progress' && (
              <div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t.identityVerification.startingTitle}</h3>
                <p className="text-gray-600 mb-6">{t.identityVerification.startingSubtitle}</p>
              </div>
            )}

            {verificationStatus === 'processing' && (
              <div>
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t.identityVerification.processingTitle}</h3>
                <p className="text-gray-600 mb-6">{t.identityVerification.processingSubtitle}</p>
              </div>
            )}

            {verificationStatus === 'completed' && (
              <div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t.identityVerification.verifiedTitle}</h3>
                <p className="text-green-600 mb-6">{t.identityVerification.verifiedSubtitle}</p>
              </div>
            )}

            {verificationStatus === 'failed' && (
              <div>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t.identityVerification.failedTitle}</h3>
                <p className="text-red-600 mb-6">{t.identityVerification.failedSubtitle}</p>
                <button
                  onClick={() => {
                    setError(null);
                    // Reset verification status through formData instead of local state
                    setFormData({...formData, stripeVerificationStatus: 'not_started'});
                    startVerification();
                  }}
                  disabled={isVerifying}
                  className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {t.identityVerification.tryAgain}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col-reverse md:flex-row md:justify-between gap-4">
        <button onClick={handlePrev} className="w-full md:w-auto px-8 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-700 font-semibold hover:bg-white/80 hover:shadow-lg transition-all duration-300 shadow-sm justify-center">{t.identityVerification.back}</button>
        <button 
          onClick={handleNext} 
          disabled={!canProceed}
          className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.identityVerification.next} <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}

// Step 6: Consent & Communication Preferences
function ConsentStep({ formData, setFormData, handleNext, handlePrev, selectedLanguage }: { 
  formData: Record<string, unknown>; 
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>; 
  handleNext: () => void; 
  handlePrev: () => void; 
  selectedLanguage: Language;
}) {
  const canProceed = formData.consentToContact && (formData.consentToText || formData.consentToCall);
  const t = getTranslations(selectedLanguage);

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t.consent.title}</h1>
      <p className="text-gray-600 mb-8">{t.consent.subtitle}</p>

      <div className="space-y-6">
        {/* Important Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">{t.consent.importantNotice}</h3>
              <p className="text-yellow-800 text-sm">
                {t.consent.noticeText}
              </p>
            </div>
          </div>
        </div>

        {/* Consent Checkboxes */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">{t.consent.communicationTitle}</h3>
          
          {/* Primary Consent */}
          <div className="space-y-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(formData.consentToContact)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, consentToContact: e.target.checked})}
                className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <div>
                <span className="text-gray-900 font-semibold">{t.consent.primaryConsent}</span>
                <p className="text-sm text-gray-600 mt-1">
                  {t.consent.primaryConsentDetail}
                </p>
              </div>
            </label>
          </div>

          {/* Communication Methods */}
          {Boolean(formData.consentToContact) && (
            <div className="pl-8 space-y-4 border-l-2 border-purple-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">{t.consent.selectMethods}</p>
              
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.consentToText)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, consentToText: e.target.checked})}
                  className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div>
                  <span className="text-gray-900 font-medium">{t.consent.textMessages}</span>
                  <p className="text-sm text-gray-600">{t.consent.textMessagesDetail}</p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.consentToCall)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, consentToCall: e.target.checked})}
                  className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div>
                  <span className="text-gray-900 font-medium">{t.consent.phoneCalls}</span>
                  <p className="text-sm text-gray-600">{t.consent.phoneCallsDetail}</p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Communication Preferences */}
        {/* {(formData.consentToText || formData.consentToCall) && (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Preferred Contact Method</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="communicationPreferences"
                  value="email"
                  checked={formData.communicationPreferences === 'email'}
                  onChange={(e) => setFormData({...formData, communicationPreferences: e.target.value})}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-gray-900">Email (primary contact method)</span>
              </label>
              
              {formData.consentToText && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="communicationPreferences"
                    value="text"
                    checked={formData.communicationPreferences === 'text'}
                    onChange={(e) => setFormData({...formData, communicationPreferences: e.target.value})}
                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                  />
                  <span className="text-gray-900">Text messages</span>
                </label>
              )}
              
              {formData.consentToCall && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="communicationPreferences"
                    value="phone"
                    checked={formData.communicationPreferences === 'phone'}
                    onChange={(e) => setFormData({...formData, communicationPreferences: e.target.value})}
                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                  />
                  <span className="text-gray-900">Phone calls</span>
                </label>
              )}
            </div>
          </div>
        )} */}
      </div>

      <div className="mt-10 flex flex-col-reverse md:flex-row md:justify-between gap-4">
        <button onClick={handlePrev} className="w-full md:w-auto px-8 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-700 font-semibold hover:bg-white/80 hover:shadow-lg transition-all duration-300 shadow-sm justify-center">{t.consent.back}</button>
        <button 
          onClick={handleNext} 
          disabled={!canProceed}
          className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.consent.next} <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}


