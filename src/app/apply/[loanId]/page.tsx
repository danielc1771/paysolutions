'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, DollarSign, User, Mail, Phone, Loader2, AlertCircle, Calendar, Lock } from 'lucide-react';
import Image from 'next/image';
import CustomSelect from '@/components/CustomSelect';
import { createClient } from '@/utils/supabase/client';

// Define the structure for loan data we expect to fetch
interface LoanApplicationData {
  borrower: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  };
  loan: {
    principal_amount: number;
    vehicleYear: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleVin: string;
    applicationStep: number;
    stripeVerificationSessionId?: string;
  };
  dealerName: string;
  loanId: string;
}

// Main Page Component
export default function ApplyPage() {
  const params = useParams();
  const loanId = params.loanId as string;

  const [step, setStep] = useState(0); // 0: loading, 1: welcome, 2-4: form, 5: success, -1: error
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({
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
        
        // Helper function to convert null values to empty strings
        const sanitizeData = (obj: Record<string, unknown>) => {
          const sanitized: Record<string, unknown> = {};
          for (const key in obj) {
            sanitized[key] = obj[key] ?? '';
          }
          return sanitized;
        };
        
        // Map database verification status to UI status consistently
        const mapVerificationStatus = (dbStatus: string) => {
          if (dbStatus === 'verified') return 'completed';
          return dbStatus;
        };

        setFormData(prev => ({
          ...prev,
          ...sanitizeData(data.borrower),
          stripeVerificationSessionId: data.loan.stripeVerificationSessionId ?? '',
          stripeVerificationStatus: mapVerificationStatus(data.loan.stripeVerificationStatus || 'pending'),
        }));
        setStep(data.loan.applicationStep || 1); // Move to the saved step or first step
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        setStep(-1); // Move to an error step
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationData();
  }, [loanId]);

  // Real-time status updates using Supabase Realtime
  useEffect(() => {
    if (!loanId) {
      console.log('❌ No loanId provided for status updates');
      return;
    }

    console.log('🔄 Setting up status update mechanism for loan:', loanId);
    const supabase = createClient();
    
    // Disable Realtime WebSocket connection for anonymous users
    // This prevents the continuous WebSocket connection failures
    const ENABLE_REALTIME = false; // Set to true when proper authentication is implemented
    
    // Map database verification status to UI status consistently
    const mapVerificationStatus = (dbStatus: string) => {
      console.log('🔄 Mapping verification status:', dbStatus);
      if (dbStatus === 'verified') return 'completed';
      return dbStatus;
    };

    // State machine to prevent backwards transitions
    const canTransitionTo = (currentStatus: string, newStatus: string) => {
      const statusOrder = ['pending', 'processing', 'verified', 'completed'];
      const currentIndex = statusOrder.indexOf(currentStatus);
      const newIndex = statusOrder.indexOf(newStatus);
      
      const canTransition = newIndex >= currentIndex || newStatus === 'requires_action' || newStatus === 'failed';
      console.log('🔄 Status transition check:', {
        currentStatus,
        newStatus,
        currentIndex,
        newIndex,
        canTransition
      });
      
      return canTransition;
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    if (ENABLE_REALTIME) {
      // Set up real-time subscription for loan updates
      console.log('📡 Creating Realtime channel for loan updates...');
      
      // Configure channel with proper authentication options
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
            console.log('🔔 Received loan update via Realtime:', {
              eventType: payload.eventType,
              table: payload.table,
              schema: payload.schema,
              timestamp: new Date().toISOString()
            });
            console.log('📋 Payload old record:', payload.old);
            console.log('📋 Payload new record:', payload.new);
            
            const newRecord = payload.new as Record<string, unknown>;
            
            // Update stripe verification status
            if (newRecord.stripe_verification_status) {
              const dbStatus = newRecord.stripe_verification_status as string;
              const uiStatus = mapVerificationStatus(dbStatus);
              
              console.log('🔄 Processing stripe verification status update:', {
                dbStatus,
                uiStatus,
                loanId
              });
              
              setFormData((prev) => {
                const currentStatus = String(prev.stripeVerificationStatus || 'pending');
                console.log('🔄 Current UI status:', currentStatus);
                
                if (canTransitionTo(currentStatus, uiStatus) && currentStatus !== uiStatus) {
                  console.log('✅ Updating stripe verification status from', currentStatus, 'to', uiStatus);
                  return { ...prev, stripeVerificationStatus: uiStatus };
                } else {
                  console.log('⚠️ Skipping status transition (no change or invalid transition)');
                  return prev;
                }
              });
            }

            // Check for application completion
            if (newRecord.status === 'application_completed' && !showSuccessDialog) {
              console.log('🎉 Application completed - showing success dialog');
              setShowSuccessDialog(true);
            }
          }
        )
        .subscribe((status, error) => {
          console.log('📡 Realtime subscription status changed:', {
            status,
            error,
            loanId,
            timestamp: new Date().toISOString()
          });
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to loan updates for loan:', loanId);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Realtime subscription error for loan:', loanId);
            console.error('❌ Error details:', error);
          } else if (status === 'TIMED_OUT') {
            console.error('⏰ Realtime subscription timed out for loan:', loanId);
          } else if (status === 'CLOSED') {
            console.log('🔒 Realtime subscription closed for loan:', loanId);
          }
        });
    } else {
      console.log('⚠️ Realtime disabled - using polling-only mode');
    }

    // Polling mechanism for status updates
    let pollInterval: NodeJS.Timeout | null = null;
    let pollAttempts = 0;
    const maxPollAttempts = 20; // Poll for 10 minutes max (30s intervals)
    
    const startPolling = () => {
      console.log('🔄 Starting polling for loan status updates...');
      
      pollInterval = setInterval(async () => {
        try {
          pollAttempts++;
          console.log(`📊 Polling attempt ${pollAttempts}/${maxPollAttempts} for loan:`, loanId);
          
          const { data: currentLoan, error } = await supabase
            .from('loans')
            .select('stripe_verification_status, status')
            .eq('id', loanId)
            .single();
          
          if (error) {
            console.error('❌ Polling error:', error);
            return;
          }
          
          if (currentLoan) {
            console.log('📊 Polling result:', currentLoan);
            
            // Update stripe verification status
            if (currentLoan.stripe_verification_status) {
              const dbStatus = currentLoan.stripe_verification_status as string;
              const uiStatus = mapVerificationStatus(dbStatus);
              
              setFormData((prev) => {
                const currentStatus = String(prev.stripeVerificationStatus || 'pending');
                if (canTransitionTo(currentStatus, uiStatus) && currentStatus !== uiStatus) {
                  console.log('✅ Polling update: stripe verification status from', currentStatus, 'to', uiStatus);
                  return { ...prev, stripeVerificationStatus: uiStatus };
                }
                return prev;
              });
            }
            
            // Check for application completion
            if (currentLoan.status === 'application_completed' && !showSuccessDialog) {
              console.log('🎉 Polling detected application completed');
              setShowSuccessDialog(true);
            }
          }
          
          // Stop polling after max attempts or if status is completed
          if (pollAttempts >= maxPollAttempts || currentLoan?.stripe_verification_status === 'completed') {
            console.log('🛑 Stopping polling:', pollAttempts >= maxPollAttempts ? 'Max attempts reached' : 'Status completed');
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          }
        } catch (error) {
          console.error('❌ Polling error:', error);
        }
      }, 15000); // Poll every 15 seconds for faster updates
    };
    
    // Start polling immediately if Realtime is disabled, or as fallback
    if (!ENABLE_REALTIME) {
      console.log('📊 Starting polling immediately (Realtime disabled)');
      startPolling();
    } else {
      // Start polling if Realtime connection fails
      setTimeout(() => {
        console.log('⏰ Realtime connection timeout - starting polling fallback');
        startPolling();
      }, 10000); // Wait 10 seconds for Realtime to connect
    }
    
    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up status update mechanisms for loan:', loanId);
      
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loanId, showSuccessDialog]);

  const saveProgress = async (currentStep: number, data: Record<string, unknown>) => {
    try {
      console.log({ data, currentStep });
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

  const handlePrev = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
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
      
      // Show success dialog instead of moving to step 8
      setShowSuccessDialog(true);
      
      // Update the loan status in realtime (will be handled by server response)
      console.log('🎉 Application submitted successfully!');
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, name: 'Welcome', component: WelcomeStep },
    { id: 2, name: 'Personal Information', component: PersonalDetailsStep },
    { id: 3, name: 'Employment Details', component: EmploymentDetailsStep },
    { id: 4, name: 'References', component: ReferencesStep },
    { id: 5, name: 'Identity Verification', component: StripeVerificationStep },
    { id: 6, name: 'Consent & Preferences', component: ConsentStep },
    { id: 7, name: 'Review & Submit', component: ReviewStep },
  ];

  const CurrentStepComponent = steps.find(s => s.id === step)?.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl">
        {/* Header and Step Indicator */}
        {step > 1 && step <= 8 && (
          <div className="mb-8">
            <p className="text-sm font-semibold text-purple-600">Step {step - 1} of {steps.length -1}</p>
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
            {loading && step === 0 && <Loader text="Loading Application..." />}
            {error && step === -1 && <ErrorMessage error={error} />}
            
            {CurrentStepComponent && (
              <CurrentStepComponent
                formData={formData}
                setFormData={setFormData}
                initialData={initialData}
                handleNext={handleNext}
                handlePrev={handlePrev}
                handleSubmit={handleSubmit}
                loading={loading}
                saveProgress={saveProgress}
              />
            )}

            {step === 8 && <SuccessMessage />}
            
            {/* Success Dialog Modal */}
            {showSuccessDialog && (
              <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-full max-w-lg mx-auto border border-white/20">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Check className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h2>
                    <p className="text-gray-600 mb-8 text-lg">
                      Your loan application has been successfully submitted and is now under review. 
                      We&apos;ll contact you within 2-3 business days with the next steps.
                    </p>
                    <div className="space-y-4">
                      <button
                        className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold py-4 px-8 rounded-2xl hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                        onClick={() => {
                          setShowSuccessDialog(false);
                          setStep(8); // Show the detailed success page
                        }}
                      >
                        View Details
                      </button>
                      <button
                        className="w-full bg-gray-200 text-gray-900 font-semibold py-4 px-8 rounded-2xl hover:bg-gray-300 transition-all duration-300 shadow-sm hover:shadow-md"
                        onClick={() => {
                          setShowSuccessDialog(false);
                          // Could redirect to a different page or close the application
                        }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Step 1: Welcome
function WelcomeStep({ initialData, handleNext }: { initialData: LoanApplicationData | null; handleNext: () => void }) {
    return (
        <div className="text-center py-8">
            <div className="text-center mb-8">
                <Image 
                  src="/logoMain.png" 
                  alt="PaySolutions Logo" 
                  width={150} 
                  height={150}
                  className="rounded-2xl shadow-lg mx-auto"
                />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Hello, {initialData?.borrower.first_name}!</h1>
            <p className="text-gray-600 text-base md:text-lg max-w-md mx-auto mb-8">You&apos;re just a few steps away from completing your loan application. Let&apos;s get started.</p>
            <button onClick={handleNext} className="w-full md:w-auto md:mx-auto px-10 py-5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center text-lg">
                Get Started <ArrowRight className="w-6 h-6 ml-3" />
            </button>
        </div>
    );
}

// Step 2: Personal Details
function PersonalDetailsStep({ formData, setFormData, initialData, handleNext }: { 
  formData: Record<string, unknown>; 
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>; 
  initialData: LoanApplicationData | null; 
  handleNext: () => void; 
}) {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Personal Information</h1>
      <p className="text-gray-600 mb-8">Please provide your personal details. Identity verification (including SSN) will be handled securely through Stripe in a later step.</p>
      
      <div className="space-y-6">
        {/* Pre-filled, non-changeable fields */}
        <div className="grid md:grid-cols-2 gap-6">
          <InfoField icon={<User />} label="Full Name" value={`${initialData?.borrower.first_name} ${initialData?.borrower.last_name}`} />
          <InfoField icon={<DollarSign />} label="Loan Amount" value={`${initialData?.loan.principal_amount.toLocaleString()}`} />
          <InfoField icon={initialData?.borrower.email ? <Mail /> : <Phone />} label="Contact" value={initialData?.borrower.email || initialData?.borrower.phone || ''} />
        </div>

        <hr className="border-gray-200" />

        {/* Vehicle and Dealer Information */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Loan Details</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <InfoField label="Dealer" value={initialData?.dealerName} icon={undefined} />
            <InfoField label="Vehicle Year" value={initialData?.loan.vehicleYear} icon={undefined} />
            <InfoField label="Vehicle Make" value={initialData?.loan.vehicleMake} icon={undefined} />
            <InfoField label="Vehicle Model" value={initialData?.loan.vehicleModel} icon={undefined} />
            <InfoField label="Vehicle VIN" value={initialData?.loan.vehicleVin} icon={undefined} />
          </div>
        </div>

        <hr className="border-gray-200" />

        {/* Form fields */}
        <InputField icon={<Calendar />} label="Date of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, dateOfBirth: e.target.value})} />
        <InputField label="Address" name="address" type="text" value={formData.address} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address: e.target.value })} icon={undefined} />
        <div className="grid md:grid-cols-3 gap-4">
          <InputField label="City" name="city" type="text" value={formData.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, city: e.target.value })} icon={undefined} />
          <InputField label="State" name="state" type="text" value={formData.state} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, state: e.target.value })} icon={undefined} />
          <InputField label="ZIP Code" name="zipCode" type="text" value={formData.zipCode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, zipCode: e.target.value })} icon={undefined} />
        </div>
      </div>

      <div className="mt-10 flex justify-end">
        <button onClick={handleNext} className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center">
          Next <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}

// Step 3: Employment Details (New)
function EmploymentDetailsStep({ formData, setFormData, handleNext, handlePrev }: { 
  formData: Record<string, unknown>; 
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>; 
  handleNext: () => void; 
  handlePrev: () => void; 
}) {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Employment Details</h1>
      <p className="text-gray-600 mb-8">Please provide your employment information.</p>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Employment Status</label>
          <CustomSelect
            options={[
              { value: 'employed', label: 'Employed' },
              { value: 'self_employed', label: 'Self Employed' },
              { value: 'unemployed', label: 'Unemployed' },
              { value: 'retired', label: 'Retired' },
              { value: 'student', label: 'Student' },
            ]}
            value={formData.employmentStatus as string}
            onChange={(value) => setFormData({...formData, employmentStatus: value})}
            placeholder="Select Employment Status"
          />
        </div>
        <InputField label="Annual Income" name="annualIncome" type="number" placeholder="50000" value={formData.annualIncome} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, annualIncome: e.target.value })} icon={undefined} />
        <InputField label="Current Employer Name" name="currentEmployerName" type="text" value={formData.currentEmployerName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, currentEmployerName: e.target.value })} icon={undefined} />
        <InputField label="Time with Current Employment (Years)" name="timeWithEmployment" type="text" placeholder="e.g., 5 years" value={formData.timeWithEmployment} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, timeWithEmployment: e.target.value })} icon={undefined} />
      </div>

      <div className="mt-10 flex flex-col-reverse md:flex-row md:justify-between gap-4">
        <button onClick={handlePrev} className="w-full md:w-auto px-8 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-700 font-semibold hover:bg-white/80 hover:shadow-lg transition-all duration-300 shadow-sm justify-center">Back</button>
        <button onClick={handleNext} className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center">
          Next <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}

// Step 5: Review (Modified - added new employment fields)
function ReviewStep({ formData, initialData, handlePrev, handleSubmit, loading }: { 
  formData: Record<string, unknown>; 
  initialData: LoanApplicationData | null; 
  handlePrev: () => void; 
  handleSubmit: () => void; 
  loading: boolean; 
}) {
  const reviewData = {
    ...initialData?.borrower,
    ...initialData?.loan,
    ...formData
  };

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Review Your Application</h1>
      <p className="text-gray-600 mb-8">Please confirm that the following information is correct before submitting.</p>
      
      <div className="space-y-6 bg-gray-50/50 p-4 md:p-6 rounded-2xl border">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Basic Information</h3>
          <div className="space-y-2">
            <ReviewItem label="Full Name" value={`${reviewData.first_name || ''} ${reviewData.last_name || ''}`} />
            <ReviewItem label="Email" value={reviewData.email || 'Not provided'} />
            <ReviewItem label="Phone" value={reviewData.phone || 'Not provided'} />
            <ReviewItem label="Date of Birth" value={(reviewData as Record<string, unknown>).dateOfBirth as string || 'Not provided'} />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Address Information */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Address</h3>
          <div className="space-y-2">
            <ReviewItem label="Street Address" value={(reviewData as Record<string, unknown>).address as string || 'Not provided'} />
            <ReviewItem label="City" value={(reviewData as Record<string, unknown>).city as string || 'Not provided'} />
            <ReviewItem label="State" value={(reviewData as Record<string, unknown>).state as string || 'Not provided'} />
            <ReviewItem label="ZIP Code" value={(reviewData as Record<string, unknown>).zipCode as string || 'Not provided'} />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Loan Information */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Loan Information</h3>
          <div className="space-y-2">
            <ReviewItem label="Loan Amount" value={`$${reviewData.principal_amount?.toLocaleString() || 'N/A'}`} />
            <ReviewItem label="Dealer" value={initialData?.dealerName || 'Not provided'} />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Vehicle Information */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Vehicle Information</h3>
          <div className="space-y-2">
            <ReviewItem label="Year" value={reviewData.vehicleYear || initialData?.loan?.vehicleYear || 'Not provided'} />
            <ReviewItem label="Make" value={reviewData.vehicleMake || initialData?.loan?.vehicleMake || 'Not provided'} />
            <ReviewItem label="Model" value={reviewData.vehicleModel || initialData?.loan?.vehicleModel || 'Not provided'} />
            <ReviewItem label="VIN" value={reviewData.vehicleVin || initialData?.loan?.vehicleVin || 'Not provided'} />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Employment Information */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Employment Information</h3>
          <div className="space-y-2">
            <ReviewItem label="Employment Status" value={(reviewData as Record<string, unknown>).employmentStatus as string || 'Not provided'} />
            <ReviewItem label="Annual Income" value={(reviewData as Record<string, unknown>).annualIncome ? `$${parseFloat((reviewData as Record<string, unknown>).annualIncome as string).toLocaleString()}` : 'Not provided'} />
            <ReviewItem label="Current Employer" value={(reviewData as Record<string, unknown>).currentEmployerName as string || 'Not provided'} />
            <ReviewItem label="Time with Employment" value={(reviewData as Record<string, unknown>).timeWithEmployment as string || 'Not provided'} />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* References */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">References</h3>
          <div className="space-y-4">
            {/* Reference 1 */}
            {((reviewData as Record<string, unknown>).reference1Name || (reviewData as Record<string, unknown>).reference1Phone || (reviewData as Record<string, unknown>).reference1Email) ? (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Reference 1</h4>
                <div className="ml-4 space-y-1">
                  {(reviewData as Record<string, unknown>).reference1Name ? <ReviewItem label="Name" value={(reviewData as Record<string, unknown>).reference1Name as string} /> : null}
                  {(reviewData as Record<string, unknown>).reference1Phone ? <ReviewItem label="Phone" value={(reviewData as Record<string, unknown>).reference1Phone as string} /> : null}
                  {(reviewData as Record<string, unknown>).reference1Email ? <ReviewItem label="Email" value={(reviewData as Record<string, unknown>).reference1Email as string} /> : null}
                </div>
              </div>
            ) : null}
            
            {/* Reference 2 */}
            {((reviewData as Record<string, unknown>).reference2Name || (reviewData as Record<string, unknown>).reference2Phone || (reviewData as Record<string, unknown>).reference2Email) ? (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Reference 2</h4>
                <div className="ml-4 space-y-1">
                  {(reviewData as Record<string, unknown>).reference2Name ? <ReviewItem label="Name" value={(reviewData as Record<string, unknown>).reference2Name as string} /> : null}
                  {(reviewData as Record<string, unknown>).reference2Phone ? <ReviewItem label="Phone" value={(reviewData as Record<string, unknown>).reference2Phone as string} /> : null}
                  {(reviewData as Record<string, unknown>).reference2Email ? <ReviewItem label="Email" value={(reviewData as Record<string, unknown>).reference2Email as string} /> : null}
                </div>
              </div>
            ) : null}
            
            {/* Reference 3 */}
            {((reviewData as Record<string, unknown>).reference3Name || (reviewData as Record<string, unknown>).reference3Phone || (reviewData as Record<string, unknown>).reference3Email) ? (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Reference 3</h4>
                <div className="ml-4 space-y-1">
                  {(reviewData as Record<string, unknown>).reference3Name ? <ReviewItem label="Name" value={(reviewData as Record<string, unknown>).reference3Name as string} /> : null}
                  {(reviewData as Record<string, unknown>).reference3Phone ? <ReviewItem label="Phone" value={(reviewData as Record<string, unknown>).reference3Phone as string} /> : null}
                  {(reviewData as Record<string, unknown>).reference3Email ? <ReviewItem label="Email" value={(reviewData as Record<string, unknown>).reference3Email as string} /> : null}
                </div>
              </div>
            ) : null}
            
            {!(reviewData as Record<string, unknown>).reference1Name && !(reviewData as Record<string, unknown>).reference1Phone && !(reviewData as Record<string, unknown>).reference1Email &&
             !(reviewData as Record<string, unknown>).reference2Name && !(reviewData as Record<string, unknown>).reference2Phone && !(reviewData as Record<string, unknown>).reference2Email &&
             !(reviewData as Record<string, unknown>).reference3Name && !(reviewData as Record<string, unknown>).reference3Phone && !(reviewData as Record<string, unknown>).reference3Email ? (
              <p className="text-gray-500 italic">No references provided</p>
            ) : null}
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Verification & Consent */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Verification & Consent</h3>
          <div className="space-y-2">
            <ReviewItem 
              label="Identity Verification" 
              value={(reviewData as Record<string, unknown>).stripeVerificationStatus === 'completed' ? '✅ Verified via Stripe Identity' : '⏳ Pending verification'} 
            />
            <ReviewItem label="Communication Consent" value={(reviewData as Record<string, unknown>).consentToContact ? '✅ Yes' : '❌ No'} />
            {(reviewData as Record<string, unknown>).consentToText ? <ReviewItem label="Text Message Consent" value="✅ Yes" /> : null}
            {(reviewData as Record<string, unknown>).consentToCall ? <ReviewItem label="Phone Call Consent" value="✅ Yes" /> : null}
            {(reviewData as Record<string, unknown>).communicationPreferences ? (
              <ReviewItem label="Preferred Contact Method" value={(reviewData as Record<string, unknown>).communicationPreferences as string} />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col-reverse md:flex-row md:justify-between gap-4">
        <button onClick={handlePrev} className="w-full md:w-auto px-8 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-700 font-semibold hover:bg-white/80 hover:shadow-lg transition-all duration-300 shadow-sm justify-center">Back</button>
        <button onClick={handleSubmit} disabled={loading} className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />} Submit Application
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

const ErrorMessage = ({ error }: { error: string }) => (
  <div className="text-center py-20">
    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <AlertCircle className="w-8 h-8 text-red-500" />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">An Error Occurred</h2>
    <p className="text-gray-600">{error}</p>
  </div>
);

const SuccessMessage = () => (
  <div className="text-center py-12">
    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <Check className="w-10 h-10 text-green-500" />
    </div>
    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Congratulations!</h2>
    <h3 className="text-xl md:text-2xl font-semibold text-green-600 mb-6">Your Application is Under Review</h3>
    
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-green-800 mb-3">What Happens Next?</h4>
        <div className="space-y-3 text-left">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-700 text-sm font-bold">1</span>
            </div>
            <p className="text-green-700">Our team will review your application and verify all information provided</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-700 text-sm font-bold">2</span>
            </div>
            <p className="text-green-700">We&apos;ll contact your references and employer to confirm employment details</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-700 text-sm font-bold">3</span>
            </div>
            <p className="text-green-700">You&apos;ll receive loan terms and next steps within 2-3 business days</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-blue-800 mb-3">Important Information</h4>
        <div className="space-y-2 text-left text-blue-700">
          <p>• Check your email and phone for updates from our team</p>
          <p>• Your identity has been verified through Stripe Identity</p>
          <p>• We&apos;ll contact you using your preferred communication method</p>
          <p>• Keep your phone accessible in case we need additional information</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-gray-800 mb-2">Questions?</h4>
        <p className="text-gray-600">
          If you have any questions about your application, please contact our customer service team.
        </p>
      </div>
    </div>
  </div>
);

// New Step: References
function ReferencesStep({ formData, setFormData, handleNext, handlePrev }: { 
  formData: Record<string, unknown>; 
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>; 
  handleNext: () => void; 
  handlePrev: () => void; 
}) {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">References</h1>
      <p className="text-gray-600 mb-8">Please provide three personal references.</p>

      <div className="space-y-8">
        {[1, 2, 3].map((num) => (
          <div key={num} className="p-4 border border-gray-200 rounded-2xl bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reference {num}</h3>
            <div className="space-y-4">
              <InputField label="Name" name={`reference${num}Name`} type="text" value={formData[`reference${num}Name`]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [`reference${num}Name`]: e.target.value})} />
              <InputField label="Phone" name={`reference${num}Phone`} type="text" value={formData[`reference${num}Phone`]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [`reference${num}Phone`]: e.target.value})} />
              <InputField label="Email" name={`reference${num}Email`} type="email" value={formData[`reference${num}Email`]} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [`reference${num}Email`]: e.target.value})} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col-reverse md:flex-row md:justify-between gap-4">
        <button onClick={handlePrev} className="w-full md:w-auto px-8 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-700 font-semibold hover:bg-white/80 hover:shadow-lg transition-all duration-300 shadow-sm justify-center">Back</button>
        <button onClick={handleNext} className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center">
          Next <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}

// Step 5: Stripe Identity Verification
function StripeVerificationStep({ formData, setFormData, initialData, handleNext, handlePrev, saveProgress }: { 
  formData: Record<string, unknown>; 
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>; 
  initialData: LoanApplicationData | null; 
  handleNext: () => void; 
  handlePrev: () => void; 
  saveProgress: (step: number, data: Record<string, unknown>) => void; 
}) {
  const [verificationStatus, setVerificationStatus] = useState(formData.stripeVerificationStatus || 'not_started');
  const [isVerifying, setIsVerifying] = useState(false);
  const [stripe, setStripe] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Load Stripe.js
  useEffect(() => {
    const loadStripe = async () => {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      console.log('🔑 Stripe publishable key:', publishableKey ? 'Found' : 'Missing');
      
      if (!publishableKey) {
        setError('Stripe publishable key not found. Please check your environment configuration.');
        return;
      }
      
      if (window.Stripe) {
        const stripeInstance = window.Stripe(publishableKey);
        setStripe(stripeInstance);
        console.log('✅ Stripe loaded from window');
      } else {
        // Add Stripe.js script if not already loaded
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = () => {
          const stripeInstance = window.Stripe(publishableKey);
          setStripe(stripeInstance);
          console.log('✅ Stripe loaded from script');
        };
        document.head.appendChild(script);
      }
    };
    
    loadStripe();
  }, []);

  // Update local status when formData changes (from webhooks)
  useEffect(() => {
    const newStatus = formData.stripeVerificationStatus || 'not_started';
    console.log('🔄 StripeVerificationStep: Status updated to:', newStatus);
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

      console.log('✅ Verification skipped successfully');
      setFormData({
        ...formData,
        stripeVerificationStatus: 'completed',
      });
    } catch (err: unknown) {
      console.error('❌ Error skipping verification:', err);
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
    console.log('🚀 Starting verification process...');
    
    try {
      // Create verification session on the server
      console.log('📞 Creating verification session...');
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

      console.log('✅ Verification session created:', session.verification_session_id);

      // Save the session ID to the database
      await saveProgress(5, { ...formData, stripeVerificationSessionId: session.verification_session_id });
      setFormData({ ...formData, stripeVerificationSessionId: session.verification_session_id });

      // Show the verification modal using Stripe.js
      console.log('🎯 Launching Stripe Identity modal...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (stripe as any).verifyIdentity(session.client_secret);

      if (result.error) {
        // Handle specific error codes according to Stripe documentation
        console.error('❌ Verification error:', result.error);
        
        let errorMessage = 'Verification failed. Please try again.';
        
        // Handle specific error codes
        switch (result.error.code) {
          case 'consent_declined':
            errorMessage = 'Verification was declined. Please try again and accept the terms.';
            break;
          case 'device_unsupported':
            errorMessage = 'Your device is not supported. Please use a device with a camera.';
            break;
          case 'document_unverified_other':
            errorMessage = 'Document could not be verified. Please try with a different document.';
            break;
          case 'document_expired':
            errorMessage = 'Document has expired. Please use a current document.';
            break;
          case 'document_type_not_supported':
            errorMessage = 'Document type not supported. Please use a government-issued ID.';
            break;
          default:
            if (result.error.message) {
              errorMessage = result.error.message;
            }
        }
        
        setError(errorMessage);
        // Don't automatically set to failed - let the webhook handle the status
        console.log('⚠️ Verification error, but not setting to failed automatically');
      } else {
        // Verification was submitted successfully to Stripe
        console.log('✅ Verification submitted successfully to Stripe');
        console.log('⏳ Waiting for webhook to update status...');
        setSubmitted(true);
        
        // Don't set status here - let webhook handle the actual verification result
        // The realtime subscription will update the status based on webhook events
      }
    } catch (error) {
      console.error('❌ Error in verification process:', error);
      
      // Only show error, don't set status to failed
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during verification';
      setError(errorMessage);
      console.log('⚠️ Network/system error, but not setting to failed automatically');
    } finally {
      setIsVerifying(false);
    }
  };

  const canProceed = verificationStatus === 'completed' || verificationStatus === 'verified';

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Identity Verification</h1>
      <p className="text-gray-600 mb-8">To protect against fraud and comply with regulations, we need to verify your identity using Stripe Identity.</p>

      <div className="space-y-6">
        {/* Information Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <Lock className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Secure Identity Verification</h3>
              <ul className="text-blue-800 text-sm space-y-2">
                <li>• Your personal information is encrypted and secure</li>
                <li>• We use Stripe&apos;s industry-leading identity verification</li>
                <li>• This process typically takes 2-3 minutes</li>
                <li>• You&apos;ll need a government-issued photo ID</li>
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
            {/* Initial state - ready to verify */}
            {(verificationStatus === 'not_started' || verificationStatus === 'pending' || verificationStatus === 'requires_action' || verificationStatus === 'canceled' || verificationStatus === 'unverified') && !submitted && (
              <div>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Verify</h3>
                <p className="text-gray-600 mb-6">Click the button below to start the identity verification process.</p>
                <div className="space-y-4">
                  <button
                    onClick={startVerification}
                    disabled={isVerifying}
                    className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    {isVerifying ? 'Starting...' : 'Start Verification'}
                  </button>
                  <button
                    onClick={handleSkipVerification}
                    disabled={isVerifying}
                    className="w-full px-8 py-4 bg-gray-300 text-gray-800 rounded-2xl font-semibold hover:bg-gray-400 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    Skip Verification (for testing)
                  </button>
                </div>
              </div>
            )}

            {/* Verification submitted and waiting for webhook */}
            {submitted && verificationStatus !== 'completed' && verificationStatus !== 'verified' && verificationStatus !== 'failed' && (
              <div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Submitted</h3>
                <p className="text-gray-600 mb-6">Your verification has been submitted to Stripe. We&apos;re processing your documents...</p>
              </div>
            )}

            {/* Processing state from webhook */}
            {verificationStatus === 'processing' && (
              <div>
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Verification</h3>
                <p className="text-gray-600 mb-6">Your documents are being verified. This usually takes a few moments...</p>
              </div>
            )}

            {/* Success states */}
            {(verificationStatus === 'completed' || verificationStatus === 'verified') && (
              <div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Identity Verified!</h3>
                <p className="text-green-600 mb-6">Your identity has been successfully verified. You can now proceed to the next step.</p>
              </div>
            )}

            {/* Failure state */}
            {verificationStatus === 'failed' && (
              <div>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h3>
                <p className="text-red-600 mb-6">We were unable to verify your identity. Please try again or contact support.</p>
                <button
                  onClick={() => {
                    setError(null);
                    setSubmitted(false);
                    setFormData({...formData, stripeVerificationStatus: 'not_started'});
                  }}
                  disabled={isVerifying}
                  className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col-reverse md:flex-row md:justify-between gap-4">
        <button onClick={handlePrev} className="w-full md:w-auto px-8 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-700 font-semibold hover:bg-white/80 hover:shadow-lg transition-all duration-300 shadow-sm justify-center">Back</button>
        <button 
          onClick={handleNext} 
          disabled={!canProceed}
          className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}

// Step 6: Consent & Communication Preferences
function ConsentStep({ formData, setFormData, handleNext, handlePrev }: { 
  formData: Record<string, unknown>; 
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>; 
  handleNext: () => void; 
  handlePrev: () => void; 
}) {
  const canProceed = formData.consentToContact && (formData.consentToText || formData.consentToCall);

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Communication Consent</h1>
      <p className="text-gray-600 mb-8">Please review and provide your consent for how we can contact you during your loan period.</p>

      <div className="space-y-6">
        {/* Important Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Important Notice</h3>
              <p className="text-yellow-800 text-sm">
                By proceeding with this loan application, you agree to be contacted regarding loan updates, payment reminders, and account information. 
                You must consent to at least one form of communication and cannot opt out until your loan is paid in full.
              </p>
            </div>
          </div>
        </div>

        {/* Consent Checkboxes */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">
          <h3 className="text-xl font-bold text-gray-900">Communication Consent (Required)</h3>
          
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
                <span className="text-gray-900 font-semibold">I consent to be contacted by PaySolutions regarding my loan</span>
                <p className="text-sm text-gray-600 mt-1">
                  This includes loan updates, payment notifications, account information, and customer service communications.
                </p>
              </div>
            </label>
          </div>

          {/* Communication Methods */}
          {Boolean(formData.consentToContact) && (
            <div className="pl-8 space-y-4 border-l-2 border-purple-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">Select how we can contact you (choose at least one):</p>
              
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(formData.consentToText)}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, consentToText: e.target.checked})}
                  className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div>
                  <span className="text-gray-900 font-medium">Text Messages (SMS)</span>
                  <p className="text-sm text-gray-600">Receive payment reminders, account alerts, and important updates via text message.</p>
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
                  <span className="text-gray-900 font-medium">Phone Calls</span>
                  <p className="text-sm text-gray-600">Receive calls for payment reminders, account updates, and customer service.</p>
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
        <button onClick={handlePrev} className="w-full md:w-auto px-8 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-700 font-semibold hover:bg-white/80 hover:shadow-lg transition-all duration-300 shadow-sm justify-center">Back</button>
        <button 
          onClick={handleNext} 
          disabled={!canProceed}
          className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next <ArrowRight className="w-5 h-5 ml-2" />
        </button>
      </div>
    </div>
  );
}


