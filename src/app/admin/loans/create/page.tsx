'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { Send, Edit, User, Mail, Link as LinkIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

import CustomSelect from '@/components/CustomSelect';

export default function CreateLoanPage() {
  const [mode, setMode] = useState('send');

  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
            New Loan Application
          </h1>
          <p className="text-gray-600 text-lg">Create a new loan by sending an application or entering details manually.</p>
        </div>

        {/* Mode Toggle */}
        <div className="mb-8 flex justify-center">
          <div className="bg-white/70 backdrop-blur-sm p-2 rounded-2xl shadow-md border border-white/30 flex space-x-2">
            <button
              onClick={() => setMode('send')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${mode === 'send' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-200/50'}`}
            >
              <Send className="w-5 h-5" />
              <span>Send Application</span>
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 ${mode === 'manual' ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-200/50'}`}
            >
              <Edit className="w-5 h-5" />
              <span>Enter Manually</span>
            </button>
          </div>
        </div>

        {/* Conditional Rendering of Forms */}
        {mode === 'send' ? <SendApplicationForm /> : <ManualEntryForm />}
      </div>
    </AdminLayout>
  );
}

// Form for sending an application link
function SendApplicationForm() {
  const [fullName, setFullName] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleVin, setVehicleVin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setGeneratedLink(null);

    // Basic validation
    if (!fullName || !loanAmount || !email || !vehicleYear || !vehicleMake || !vehicleModel || !vehicleVin) {
      setError('All fields are required.');
      setIsSubmitting(false);
      return;
    }

    try {
      // This API route will be updated to send the email
      const response = await fetch('/api/loans/send-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: fullName, loanAmount, customerEmail: email, vehicleYear, vehicleMake, vehicleModel, vehicleVin }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send application.');
      }

      const { message, applicationUrl } = await response.json();
      setSuccess(message);
      setGeneratedLink(applicationUrl); // Save the link for display
      setFullName('');
      setLoanAmount('');
      setEmail('');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 border border-white/20">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Send Application to Customer</h2>
      <p className="text-gray-600 mb-6">An email with a secure link will be sent for the customer to complete their application.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" required />
          </div>
        </div>
        <div>
          <label htmlFor="loanAmount" className="block text-sm font-semibold text-gray-700 mb-2">Loan Amount</label>
          <CustomSelect
            options={[
              { value: '1000', label: '$1,000' },
              { value: '1500', label: '$1,500' },
              { value: '2000', label: '$2,000' },
              { value: '2500', label: '$2,500' },
              { value: '2988', label: '$2,988' },
            ]}
            value={loanAmount}
            onChange={setLoanAmount}
            placeholder="Select a loan amount"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" required />
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white/50 p-6 rounded-2xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="vehicleYear" className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
              <input id="vehicleYear" type="number" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} placeholder="2023" className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" required />
            </div>
            <div>
              <label htmlFor="vehicleMake" className="block text-sm font-semibold text-gray-700 mb-2">Make</label>
              <input id="vehicleMake" type="text" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} placeholder="Toyota" className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" required />
            </div>
            <div>
              <label htmlFor="vehicleModel" className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
              <input id="vehicleModel" type="text" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Camry" className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" required />
            </div>
            <div>
              <label htmlFor="vehicleVin" className="block text-sm font-semibold text-gray-700 mb-2">VIN</label>
              <input id="vehicleVin" type="text" value={vehicleVin} onChange={(e) => setVehicleVin(e.target.value)} placeholder="17-character VIN" className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" required />
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <div className="flex items-center justify-center"><Send className="w-5 h-5 mr-2" />Send Email</div>}
        </button>
      </form>

      {success && (
        <div className="mt-6 p-4 bg-green-50/80 backdrop-blur-sm border border-green-200 rounded-2xl">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" />
            <div>
              <p className="text-green-800 font-semibold">{success}</p>
              {generatedLink && (
                <div className="mt-2 text-xs text-gray-600">
                  <p>For your reference, the application link is:</p>
                  <p className="font-mono text-gray-800 break-all">{generatedLink}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// The existing form for manual entry
function ManualEntryForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '', ssn: '', address: '', city: '', state: '', zipCode: '', employmentStatus: 'employed', annualIncome: '',
    principalAmount: '', interestRate: '', termMonths: '', purpose: 'personal',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateMonthlyPayment = () => {
    const principal = parseFloat(formData.principalAmount);
    const rate = parseFloat(formData.interestRate) / 100 / 12;
    const term = parseInt(formData.termMonths);
    if (principal && rate && term) {
      return (principal * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1)).toFixed(2);
    }
    return '0.00';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const borrowerResponse = await fetch('/api/borrowers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.firstName, last_name: formData.lastName, email: formData.email, phone: formData.phone, date_of_birth: formData.dateOfBirth, ssn: formData.ssn, address: formData.address, city: formData.city, state: formData.state, zip_code: formData.zipCode, employment_status: formData.employmentStatus, annual_income: parseFloat(formData.annualIncome),
        }),
      });
      if (!borrowerResponse.ok) {
        const errorData = await borrowerResponse.json();
        throw new Error(errorData.error || 'Failed to create borrower');
      }
      const borrower = await borrowerResponse.json();

      const loanResponse = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrower_id: borrower.id, principal_amount: parseFloat(formData.principalAmount), interest_rate: parseFloat(formData.interestRate) / 100, term_months: parseInt(formData.termMonths), monthly_payment: parseFloat(calculateMonthlyPayment()), purpose: formData.purpose,
        }),
      });
      if (!loanResponse.ok) {
        const errorData = await loanResponse.json();
        throw new Error(errorData.error || 'Failed to create loan');
      }

      await loanResponse.json();
      
      alert('Loan created successfully!');
      window.dispatchEvent(new CustomEvent('refreshNotifications'));
      router.push('/admin/loans');
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create loan');
      console.error('Create loan error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg border border-white/20">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Manual Loan Entry</h2>
      <p className="text-gray-600 mb-6">Enter all borrower and loan information directly.</p>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Borrower Information Section */}
        <div className="p-6 border rounded-2xl bg-white/50">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Borrower Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input fields for borrower... */}
            <div><label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label><input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label><input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Email *</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Phone</label><input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label><input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">SSN *</label><input type="text" name="ssn" value={formData.ssn} onChange={handleInputChange} required placeholder="XXX-XX-XXXX" className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-2">Address *</label><input type="text" name="address" value={formData.address} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">City *</label><input type="text" name="city" value={formData.city} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">State *</label><input type="text" name="state" value={formData.state} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code *</label><input type="text" name="zipCode" value={formData.zipCode} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Employment Status *</label><select name="employmentStatus" value={formData.employmentStatus} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300"><option value="employed">Employed</option><option value="self_employed">Self Employed</option><option value="unemployed">Unemployed</option><option value="retired">Retired</option><option value="student">Student</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Annual Income *</label><input type="number" name="annualIncome" value={formData.annualIncome} onChange={handleInputChange} required min="0" step="0.01" className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
          </div>
        </div>

        {/* Loan Information Section */}
        <div className="p-6 border rounded-2xl bg-white/50">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Loan Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input fields for loan... */}
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Principal Amount *</label><input type="number" name="principalAmount" value={formData.principalAmount} onChange={handleInputChange} required min="0" step="0.01" className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%) *</label><input type="number" name="interestRate" value={formData.interestRate} onChange={handleInputChange} required min="0" max="100" step="0.01" className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Term (Months) *</label><input type="number" name="termMonths" value={formData.termMonths} onChange={handleInputChange} required min="1" className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Monthly Payment</label><div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-2xl text-gray-700">${calculateMonthlyPayment()}</div></div>
            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Loan Purpose *</label><select name="purpose" value={formData.purpose} onChange={handleInputChange} required className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300"><option value="personal">Personal</option><option value="business">Business</option><option value="auto">Auto</option><option value="home">Home</option><option value="education">Education</option><option value="other">Other</option></select></div>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={() => router.back()} className="px-8 py-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-700 font-semibold hover:bg-white/80 hover:shadow-lg transition-all duration-300 shadow-sm">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Create Loan'}
          </button>
        </div>
      </form>
    </div>
  );
}
