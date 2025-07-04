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
}

// Main Page Component
export default function ApplyPage() {
  const params = useParams();
  const loanId = params.loanId as string;

  const [step, setStep] = useState(0); // 0: loading, 1: welcome, 2-4: form, 5: success, -1: error
  const [formData, setFormData] = useState<any>({
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
        const sanitizeData = (obj: any) => {
          const sanitized: any = {};
          for (const key in obj) {
            sanitized[key] = obj[key] ?? '';
          }
          return sanitized;
        };
        
        setFormData({
          ...formData,
          ...sanitizeData(data.borrower),
          stripeVerificationSessionId: data.loan.stripeVerificationSessionId ?? '',
        });
        setStep(data.loan.applicationStep || 1); // Move to the saved step or first step
      } catch (err: any) {
        setError(err.message);
        setStep(-1); // Move to an error step
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationData();
  }, [loanId]);

  // Set up Supabase Realtime subscription to listen for verification status changes
  useEffect(() => {
    if (!loanId) return;

    const supabase = createClient();
    
    // Subscribe to changes in the loans table for this specific loan
    const channel = supabase
      .channel('loan-verification-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loans',
          filter: `id=eq.${loanId}`,
        },
        (payload) => {
          console.log('🔄 Realtime update received for loan:', loanId, payload);
          
          // Update verification status when webhook updates the database
          if (payload.new && payload.new.stripe_verification_status) {
            const dbStatus = payload.new.stripe_verification_status;
            console.log(`✅ Database verification status updated to: ${dbStatus}`);
            
            // Map database status to UI status
            let uiStatus = dbStatus;
            if (dbStatus === 'verified') {
              uiStatus = 'completed';
            }
            
            setFormData((prev) => ({
              ...prev,
              stripeVerificationStatus: uiStatus,
            }));

            console.log('🔄 Verification status updated in formData to:', uiStatus);
            
            // If verification is completed, user can proceed
            if (uiStatus === 'completed') {
              console.log('🎉 Verification completed! User can proceed.');
            } else if (uiStatus === 'requires_action') {
              setError('Verification failed. Please try again or contact support.');
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🎯 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to Realtime updates for loan:', loanId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime subscription error for loan:', loanId);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up Realtime subscription for loan:', loanId);
      supabase.removeChannel(channel);
    };
  }, [loanId]);

  const saveProgress = async (currentStep: number, data: any) => {
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
      setStep(8); // Move to success step
    } catch (err: any) {
      setError(err.message);
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
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Step 1: Welcome
function WelcomeStep({ initialData, handleNext }) {
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
            <p className="text-gray-600 text-base md:text-lg max-w-md mx-auto mb-8">You're just a few steps away from completing your loan application. Let's get started.</p>
            <button onClick={handleNext} className="w-full md:w-auto md:mx-auto px-10 py-5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center text-lg">
                Get Started <ArrowRight className="w-6 h-6 ml-3" />
            </button>
        </div>
    );
}

// Step 2: Personal Details
function PersonalDetailsStep({ formData, setFormData, initialData, handleNext, handlePrev }) {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Personal Information</h1>
      <p className="text-gray-600 mb-8">Please provide your personal details. Identity verification (including SSN) will be handled securely through Stripe in a later step.</p>
      
      <div className="space-y-6">
        {/* Pre-filled, non-changeable fields */}
        <div className="grid md:grid-cols-2 gap-6">
          <InfoField icon={<User />} label="Full Name" value={`${initialData?.borrower.first_name} ${initialData?.borrower.last_name}`} />
          <InfoField icon={<DollarSign />} label="Loan Amount" value={`${initialData?.loan.principal_amount.toLocaleString()}`} />
          <InfoField icon={initialData?.borrower.email ? <Mail /> : <Phone />} label="Contact" value={initialData?.borrower.email || initialData?.borrower.phone} />
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
        <InputField icon={<Calendar />} label="Date of Birth" name="dateOfBirth" type="date" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} />
        <InputField label="Address" name="address" type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} icon={undefined} />
        <div className="grid md:grid-cols-3 gap-4">
          <InputField label="City" name="city" type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} icon={undefined} />
          <InputField label="State" name="state" type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} icon={undefined} />
          <InputField label="ZIP Code" name="zipCode" type="text" value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} icon={undefined} />
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
function EmploymentDetailsStep({ formData, setFormData, handleNext, handlePrev }) {
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
            value={formData.employmentStatus}
            onChange={(value) => setFormData({...formData, employmentStatus: value})}
            placeholder="Select Employment Status"
          />
        </div>
        <InputField label="Annual Income" name="annualIncome" type="number" placeholder="50000" value={formData.annualIncome} onChange={(e) => setFormData({ ...formData, annualIncome: e.target.value })} icon={undefined} />
        <InputField label="Current Employer Name" name="currentEmployerName" type="text" value={formData.currentEmployerName} onChange={(e) => setFormData({ ...formData, currentEmployerName: e.target.value })} icon={undefined} />
        <InputField label="Time with Current Employment (Years)" name="timeWithEmployment" type="text" placeholder="e.g., 5 years" value={formData.timeWithEmployment} onChange={(e) => setFormData({ ...formData, timeWithEmployment: e.target.value })} icon={undefined} />
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
function ReviewStep({ formData, initialData, handlePrev, handleSubmit, loading }) {
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
            <ReviewItem label="Date of Birth" value={reviewData.dateOfBirth || 'Not provided'} />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Address Information */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Address</h3>
          <div className="space-y-2">
            <ReviewItem label="Street Address" value={reviewData.address || 'Not provided'} />
            <ReviewItem label="City" value={reviewData.city || 'Not provided'} />
            <ReviewItem label="State" value={reviewData.state || 'Not provided'} />
            <ReviewItem label="ZIP Code" value={reviewData.zipCode || 'Not provided'} />
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
            <ReviewItem label="Employment Status" value={reviewData.employmentStatus || 'Not provided'} />
            <ReviewItem label="Annual Income" value={reviewData.annualIncome ? `$${parseFloat(reviewData.annualIncome).toLocaleString()}` : 'Not provided'} />
            <ReviewItem label="Current Employer" value={reviewData.currentEmployerName || 'Not provided'} />
            <ReviewItem label="Time with Employment" value={reviewData.timeWithEmployment || 'Not provided'} />
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* References */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">References</h3>
          <div className="space-y-4">
            {/* Reference 1 */}
            {(reviewData.reference1Name || reviewData.reference1Phone || reviewData.reference1Email) && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Reference 1</h4>
                <div className="ml-4 space-y-1">
                  {reviewData.reference1Name && <ReviewItem label="Name" value={reviewData.reference1Name} />}
                  {reviewData.reference1Phone && <ReviewItem label="Phone" value={reviewData.reference1Phone} />}
                  {reviewData.reference1Email && <ReviewItem label="Email" value={reviewData.reference1Email} />}
                </div>
              </div>
            )}
            
            {/* Reference 2 */}
            {(reviewData.reference2Name || reviewData.reference2Phone || reviewData.reference2Email) && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Reference 2</h4>
                <div className="ml-4 space-y-1">
                  {reviewData.reference2Name && <ReviewItem label="Name" value={reviewData.reference2Name} />}
                  {reviewData.reference2Phone && <ReviewItem label="Phone" value={reviewData.reference2Phone} />}
                  {reviewData.reference2Email && <ReviewItem label="Email" value={reviewData.reference2Email} />}
                </div>
              </div>
            )}
            
            {/* Reference 3 */}
            {(reviewData.reference3Name || reviewData.reference3Phone || reviewData.reference3Email) && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">Reference 3</h4>
                <div className="ml-4 space-y-1">
                  {reviewData.reference3Name && <ReviewItem label="Name" value={reviewData.reference3Name} />}
                  {reviewData.reference3Phone && <ReviewItem label="Phone" value={reviewData.reference3Phone} />}
                  {reviewData.reference3Email && <ReviewItem label="Email" value={reviewData.reference3Email} />}
                </div>
              </div>
            )}
            
            {!reviewData.reference1Name && !reviewData.reference1Phone && !reviewData.reference1Email &&
             !reviewData.reference2Name && !reviewData.reference2Phone && !reviewData.reference2Email &&
             !reviewData.reference3Name && !reviewData.reference3Phone && !reviewData.reference3Email && (
              <p className="text-gray-500 italic">No references provided</p>
            )}
          </div>
        </div>

        <hr className="border-gray-300" />

        {/* Verification & Consent */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Verification & Consent</h3>
          <div className="space-y-2">
            <ReviewItem 
              label="Identity Verification" 
              value={reviewData.stripeVerificationStatus === 'completed' ? '✅ Verified via Stripe Identity' : '⏳ Pending verification'} 
            />
            <ReviewItem label="Communication Consent" value={reviewData.consentToContact ? '✅ Yes' : '❌ No'} />
            {reviewData.consentToText && <ReviewItem label="Text Message Consent" value="✅ Yes" />}
            {reviewData.consentToCall && <ReviewItem label="Phone Call Consent" value="✅ Yes" />}
            {reviewData.communicationPreferences && (
              <ReviewItem label="Preferred Contact Method" value={reviewData.communicationPreferences} />
            )}
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
const InputField = ({ icon, label, ...props }) => (
  <div>
    <label htmlFor={props.name} className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
    <div className="relative">
      {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400">{icon}</div>}
      <input 
        {...props} 
        id={props.name} 
        value={props.value != null ? String(props.value) : ''} // Convert null/undefined/NaN to empty string
        className={`w-full py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300 ${icon ? 'pl-12 pr-4' : 'px-4'} ${props.type === 'date' ? 'appearance-none' : ''}`} 
      />
    </div>
  </div>
);

const InfoField = ({ icon, label, value }) => (
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

const ReviewItem = ({ label, value }) => (
  <div className="flex justify-between items-center py-2 text-sm md:text-base">
    <p className="text-gray-600">{label}</p>
    <p className="font-semibold text-gray-900 text-right">{value}</p>
  </div>
);

const Loader = ({ text }) => (
  <div className="flex flex-col items-center justify-center py-20">
    <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
    <p className="text-gray-600 font-medium">{text}</p>
  </div>
);

const ErrorMessage = ({ error }) => (
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
            <p className="text-green-700">We'll contact your references and employer to confirm employment details</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-green-700 text-sm font-bold">3</span>
            </div>
            <p className="text-green-700">You'll receive loan terms and next steps within 2-3 business days</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h4 className="text-lg font-semibold text-blue-800 mb-3">Important Information</h4>
        <div className="space-y-2 text-left text-blue-700">
          <p>• Check your email and phone for updates from our team</p>
          <p>• Your identity has been verified through Stripe Identity</p>
          <p>• We'll contact you using your preferred communication method</p>
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
function ReferencesStep({ formData, setFormData, handleNext, handlePrev }) {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">References</h1>
      <p className="text-gray-600 mb-8">Please provide three personal references.</p>

      <div className="space-y-8">
        {[1, 2, 3].map((num) => (
          <div key={num} className="p-4 border border-gray-200 rounded-2xl bg-gray-50/50">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reference {num}</h3>
            <div className="space-y-4">
              <InputField label="Name" name={`reference${num}Name`} type="text" value={formData[`reference${num}Name`]} onChange={(e) => setFormData({...formData, [`reference${num}Name`]: e.target.value})} />
              <InputField label="Phone" name={`reference${num}Phone`} type="text" value={formData[`reference${num}Phone`]} onChange={(e) => setFormData({...formData, [`reference${num}Phone`]: e.target.value})} />
              <InputField label="Email" name={`reference${num}Email`} type="email" value={formData[`reference${num}Email`]} onChange={(e) => setFormData({...formData, [`reference${num}Email`]: e.target.value})} />
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
function StripeVerificationStep({ formData, setFormData, initialData, handleNext, handlePrev, saveProgress }) {
  const [verificationStatus, setVerificationStatus] = useState(formData.stripeVerificationStatus || 'not_started'); // not_started, in_progress, completed, failed
  const [isVerifying, setIsVerifying] = useState(false);
  const [stripe, setStripe] = useState(null);
  const [error, setError] = useState(null);

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

      setVerificationStatus('completed');
      setFormData({
        ...formData,
        stripeVerificationStatus: 'completed',
      });
    } catch (err: any) {
      console.error('Error skipping verification:', err);
      setError(err.message);
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
    setVerificationStatus('in_progress');
    setError(null);
    
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
      const result = await stripe.verifyIdentity(session.client_secret);

      if (result.error) {
        // Handle verification errors
        console.error('Verification error:', result.error);
        setVerificationStatus('failed');
        
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
        // Verification was submitted successfully
        setVerificationStatus('processing');
        setFormData({
          ...formData, 
          stripeVerificationStatus: 'processing',
        });
        
        // Webhook will handle status updates automatically
        console.log('Verification submitted. Waiting for webhook updates...');
      }
    } catch (error) {
      console.error('Error starting verification:', error);
      setVerificationStatus('failed');
      
      // Handle error message safely
      const errorMessage = error?.message || error?.toString() || 'An unexpected error occurred during verification';
      setError(errorMessage);
      setFormData({...formData, stripeVerificationStatus: 'failed'});
    } finally {
      setIsVerifying(false);
    }
  };

  const canProceed = verificationStatus === 'completed';

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
                <li>• We use Stripe's industry-leading identity verification</li>
                <li>• This process typically takes 2-3 minutes</li>
                <li>• You'll need a government-issued photo ID</li>
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
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Verify</h3>
                <p className="text-gray-600 mb-6">Click the button below to start the identity verification process.</p>
                <button
                  onClick={startVerification}
                  disabled={isVerifying}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  Start Verification
                </button>
                <button
                  onClick={handleSkipVerification}
                  disabled={isVerifying}
                  className="mt-4 px-8 py-4 bg-gray-300 text-gray-800 rounded-2xl font-semibold hover:bg-gray-400 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  Skip Verification (for testing)
                </button>
              </div>
            )}

            {verificationStatus === 'in_progress' && (
              <div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Starting Verification</h3>
                <p className="text-gray-600 mb-6">Please complete the identity verification in the Stripe modal...</p>
              </div>
            )}

            {verificationStatus === 'processing' && (
              <div>
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Verification</h3>
                <p className="text-gray-600 mb-6">Your documents are being verified. This usually takes a few moments...</p>
              </div>
            )}

            {verificationStatus === 'completed' && (
              <div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Identity Verified!</h3>
                <p className="text-green-600 mb-6">Your identity has been successfully verified. You can now proceed to the next step.</p>
              </div>
            )}

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
                    setVerificationStatus('not_started');
                    startVerification();
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
function ConsentStep({ formData, setFormData, handleNext, handlePrev }) {
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
                checked={formData.consentToContact}
                onChange={(e) => setFormData({...formData, consentToContact: e.target.checked})}
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
          {formData.consentToContact && (
            <div className="pl-8 space-y-4 border-l-2 border-purple-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">Select how we can contact you (choose at least one):</p>
              
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.consentToText}
                  onChange={(e) => setFormData({...formData, consentToText: e.target.checked})}
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
                  checked={formData.consentToCall}
                  onChange={(e) => setFormData({...formData, consentToCall: e.target.checked})}
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


