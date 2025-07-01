'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, DollarSign, User, Mail, Phone, Loader2, AlertCircle, Calendar, Lock } from 'lucide-react';
import Image from 'next/image';
import CustomSelect from '@/components/CustomSelect';

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
    ssn: '',
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
        setInitialData(data);
        setStep(1); // Move to the first step (Welcome)
      } catch (err: any) {
        setError(err.message);
        setStep(-1); // Move to an error step
      } finally {
        setLoading(false);
      }
    };

    fetchApplicationData();
  }, [loanId]);

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/apply/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to submit application.');
      }
      setStep(5); // Move to success step
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
    { id: 5, name: 'Review & Submit', component: ReviewStep },
  ];

  const CurrentStepComponent = steps.find(s => s.id === step)?.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl">
        {/* Header and Step Indicator */}
        {step > 1 && step <= 6 && (
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
              />
            )}

            {step === 7 && <SuccessMessage />}
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
      <p className="text-gray-600 mb-8">Please provide your personal details to complete your application.</p>
      
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
        <InputField icon={<Lock />} label="Social Security Number" name="ssn" type="text" placeholder="XXX-XX-XXXX" value={formData.ssn} onChange={(e) => setFormData({...formData, ssn: e.target.value})} />
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
      
      <div className="space-y-4 bg-gray-50/50 p-4 md:p-6 rounded-2xl border">
        <ReviewItem label="Full Name" value={`${reviewData.first_name} ${reviewData.last_name}`} />
        <ReviewItem label="Contact" value={reviewData.email || reviewData.phone} />
        <ReviewItem label="Loan Amount" value={`${reviewData.principal_amount?.toLocaleString()}`} />
        <hr />
        <ReviewItem label="Dealer" value={reviewData.dealerName} />
        <ReviewItem label="Vehicle Year" value={reviewData.vehicleYear} />
        <ReviewItem label="Vehicle Make" value={reviewData.vehicleMake} />
        <ReviewItem label="Vehicle Model" value={reviewData.vehicleModel} />
        <ReviewItem label="Vehicle VIN" value={reviewData.vehicleVin} />
        <hr />
        <ReviewItem label="Date of Birth" value={reviewData.dateOfBirth} />
        <ReviewItem label="SSN" value={reviewData.ssn.replace(/\d(?=\d{4})/g, "*")} />
        <ReviewItem label="Address" value={`${reviewData.address}, ${reviewData.city}, ${reviewData.state} ${reviewData.zipCode}`} />
        <hr />
        <ReviewItem label="Employment Status" value={reviewData.employmentStatus} />
        <ReviewItem label="Annual Income" value={`${parseFloat(reviewData.annualIncome).toLocaleString()}`} />
        <ReviewItem label="Current Employer" value={reviewData.currentEmployerName} />
        <ReviewItem label="Time with Employment" value={reviewData.timeWithEmployment} />
        <hr />
        <h3 className="text-xl font-bold text-gray-900 mb-4">References</h3>
        <ReviewItem label="Reference 1 Name" value={reviewData.reference1Name} />
        <ReviewItem label="Reference 1 Phone" value={reviewData.reference1Phone} />
        <ReviewItem label="Reference 1 Email" value={reviewData.reference1Email} />
        <ReviewItem label="Reference 2 Name" value={reviewData.reference2Name} />
        <ReviewItem label="Reference 2 Phone" value={reviewData.reference2Phone} />
        <ReviewItem label="Reference 2 Email" value={reviewData.reference2Email} />
        <ReviewItem label="Reference 3 Name" value={reviewData.reference3Name} />
        <ReviewItem label="Reference 3 Phone" value={reviewData.reference3Phone} />
        <ReviewItem label="Reference 3 Email" value={reviewData.reference3Email} />
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
      <input {...props} id={props.name} className={`w-full py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300 ${icon ? 'pl-12 pr-4' : 'px-4'} ${props.type === 'date' ? 'appearance-none' : ''}`} />
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
  <div className="text-center py-20">
    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Check className="w-8 h-8 text-green-500" />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
    <p className="text-gray-600">Thank you. We have received your application and will be in touch soon.</p>
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


