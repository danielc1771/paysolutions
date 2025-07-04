'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserLayout from '@/components/UserLayout';
import { RoleRedirect } from '@/components/auth/RoleRedirect';
import { createClient } from '@/utils/supabase/client';

export default function CreateLoan() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('send-application');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [organizationInfo, setOrganizationInfo] = useState<Record<string, unknown> | null>(null);
  const supabase = createClient();

  // Send Application Form State (no longer includes dealer info)
  const [sendFormData, setSendFormData] = useState({
    customerName: '',
    customerEmail: '',
    loanAmount: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleVin: ''
  });

  // Manual Entry Form State (same as admin)
  const [manualFormData, setManualFormData] = useState({
    // Borrower Info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    addressLine1: '',
    city: '',
    state: '',
    zipCode: '',
    employmentStatus: '',
    annualIncome: '',
    currentEmployerName: '',
    timeWithEmployment: '',
    
    // Loan Info
    principalAmount: '',
    interestRate: '8.99',
    termMonths: '48',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleVin: '',
    dealerName: '',
    dealerEmail: '',
    dealerPhone: '',

    // References
    reference1Name: '',
    reference1Phone: '',
    reference1Email: '',
    reference2Name: '',
    reference2Phone: '',
    reference2Email: '',
    reference3Name: '',
    reference3Phone: '',
    reference3Email: ''
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
                name,
                email,
                phone
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
            setOrganizationInfo(profile.organizations);
          }
        }
      } catch (err) {
        console.error('Error fetching organization info:', err);
        setError('Unable to fetch organization information');
      }
    };

    fetchOrganizationInfo();
  }, [supabase]);

  const handleSendApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/loans/send-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...sendFormData,
          dealerName: organizationInfo?.name || '',
          dealerEmail: organizationInfo?.email || '',
          dealerPhone: organizationInfo?.phone || ''
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // If it's not JSON (likely HTML error page), get text content
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse);
        throw new Error(`Server error: Received HTML instead of JSON. Status: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to send application');
      }

      setSuccess(`Application sent successfully! Application URL: ${result.applicationUrl}`);
      setSendFormData({
        customerName: '',
        customerEmail: '',
        loanAmount: '',
        vehicleYear: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleVin: ''
      });

      // Redirect to loans page after 3 seconds
      setTimeout(() => {
        router.push('/dashboard/loans');
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/loans/manual-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(manualFormData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create loan');
      }

      setSuccess('Loan created successfully!');
      
      // Reset form
      setManualFormData({
        firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '',
        addressLine1: '', city: '', state: '', zipCode: '', employmentStatus: '',
        annualIncome: '', currentEmployerName: '', timeWithEmployment: '',
        principalAmount: '', interestRate: '8.99', termMonths: '48',
        vehicleYear: '', vehicleMake: '', vehicleModel: '', vehicleVin: '',
        dealerName: '', dealerEmail: '', dealerPhone: '',
        reference1Name: '', reference1Phone: '', reference1Email: '',
        reference2Name: '', reference2Phone: '', reference2Email: '',
        reference3Name: '', reference3Phone: '', reference3Email: ''
      });

      // Redirect to loans page after 3 seconds
      setTimeout(() => {
        router.push('/dashboard/loans');
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loanAmountOptions = ['1000', '1500', '2000', '2500', '2988'];

  return (
    <RoleRedirect allowedRoles={['user']}>
      <UserLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-3">
                Create New Loan
              </h1>
              <p className="text-gray-600 text-lg">Choose how you&apos;d like to create the loan application</p>
            </div>

            {/* Tabs */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
              <div className="border-b border-white/30">
                <nav className="flex">
                  <button
                    onClick={() => setActiveTab('send-application')}
                    className={`flex-1 py-6 px-8 text-center font-semibold transition-all duration-300 ${
                      activeTab === 'send-application'
                        ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Send Application (Recommended)</span>
                    </div>
                    <p className="text-sm mt-1 opacity-80">Email application link to customer</p>
                  </button>
                  <button
                    onClick={() => setActiveTab('manual-entry')}
                    className={`flex-1 py-6 px-8 text-center font-semibold transition-all duration-300 ${
                      activeTab === 'manual-entry'
                        ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Manual Entry</span>
                    </div>
                    <p className="text-sm mt-1 opacity-80">Enter all details manually</p>
                  </button>
                </nav>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="p-6 bg-red-50 border-b border-red-200">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-red-700">{error}</span>
                  </div>
                </div>
              )}

              {success && (
                <div className="p-6 bg-green-50 border-b border-green-200">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-700">{success}</span>
                  </div>
                </div>
              )}

              {/* Send Application Form */}
              {activeTab === 'send-application' && (
                <form onSubmit={handleSendApplication} className="p-8 space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-blue-700 text-sm">
                        This will send an email to the customer with a secure link to complete their loan application online.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                        <input
                          type="text"
                          required
                          value={sendFormData.customerName}
                          onChange={(e) => setSendFormData(prev => ({ ...prev, customerName: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="John Doe"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Customer Email *</label>
                        <input
                          type="email"
                          required
                          value={sendFormData.customerEmail}
                          onChange={(e) => setSendFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="john@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount *</label>
                        <select
                          required
                          value={sendFormData.loanAmount}
                          onChange={(e) => setSendFormData(prev => ({ ...prev, loanAmount: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        >
                          <option value="">Select loan amount</option>
                          {loanAmountOptions.map(amount => (
                            <option key={amount} value={amount}>${parseInt(amount).toLocaleString()}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Vehicle Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Year *</label>
                        <input
                          type="text"
                          required
                          value={sendFormData.vehicleYear}
                          onChange={(e) => setSendFormData(prev => ({ ...prev, vehicleYear: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="2020"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Make *</label>
                        <input
                          type="text"
                          required
                          value={sendFormData.vehicleMake}
                          onChange={(e) => setSendFormData(prev => ({ ...prev, vehicleMake: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="Honda"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Model *</label>
                        <input
                          type="text"
                          required
                          value={sendFormData.vehicleModel}
                          onChange={(e) => setSendFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="Civic"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle VIN *</label>
                        <input
                          type="text"
                          required
                          value={sendFormData.vehicleVin}
                          onChange={(e) => setSendFormData(prev => ({ ...prev, vehicleVin: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="1HGBH41JXMN109186"
                        />
                      </div>
                    </div>

                    {/* Organization Information (Auto-populated) */}
                    <div className="md:col-span-2 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Dealership Information</h3>
                      
                      {organizationInfo ? (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-green-700 mb-1">Dealership Name</label>
                              <p className="text-green-900 font-semibold">{organizationInfo.name}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-green-700 mb-1">Email</label>
                              <p className="text-green-900 font-semibold">{organizationInfo.email}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-green-700 mb-1">Phone</label>
                              <p className="text-green-900 font-semibold">{organizationInfo.phone}</p>
                            </div>
                          </div>
                          <p className="text-green-600 text-sm mt-3 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            This information will be automatically included in the loan application
                          </p>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                          <p className="text-gray-600 text-center">Loading dealership information...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/loans')}
                      className="px-6 py-3 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 transition-colors"
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
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>Send Application</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Manual Entry Form - Same as admin but with user styling */}
              {activeTab === 'manual-entry' && (
                <form onSubmit={handleManualEntry} className="p-8 space-y-8">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-yellow-700 text-sm">
                        Use this option for in-person applications or when you have all customer information available.
                      </p>
                    </div>
                  </div>

                  {/* Borrower Information Section */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Borrower Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                        <input
                          type="text"
                          required
                          value={manualFormData.firstName}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                        <input
                          type="text"
                          required
                          value={manualFormData.lastName}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input
                          type="email"
                          required
                          value={manualFormData.email}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input
                          type="tel"
                          value={manualFormData.phone}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                        <input
                          type="date"
                          value={manualFormData.dateOfBirth}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <input
                          type="text"
                          value={manualFormData.addressLine1}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, addressLine1: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="123 Main Street"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                        <input
                          type="text"
                          value={manualFormData.city}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                        <input
                          type="text"
                          value={manualFormData.state}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                        <input
                          type="text"
                          value={manualFormData.zipCode}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status</label>
                        <select
                          value={manualFormData.employmentStatus}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, employmentStatus: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        >
                          <option value="">Select status</option>
                          <option value="employed">Employed</option>
                          <option value="self-employed">Self-Employed</option>
                          <option value="unemployed">Unemployed</option>
                          <option value="retired">Retired</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Annual Income</label>
                        <input
                          type="number"
                          value={manualFormData.annualIncome}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, annualIncome: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="50000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Employer</label>
                        <input
                          type="text"
                          value={manualFormData.currentEmployerName}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, currentEmployerName: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Loan Information Section */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Loan Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Principal Amount *</label>
                        <input
                          type="number"
                          required
                          value={manualFormData.principalAmount}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, principalAmount: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="15000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={manualFormData.interestRate}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, interestRate: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Term (Months)</label>
                        <select
                          value={manualFormData.termMonths}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, termMonths: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        >
                          <option value="12">12 months</option>
                          <option value="24">24 months</option>
                          <option value="36">36 months</option>
                          <option value="48">48 months</option>
                          <option value="60">60 months</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information Section */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Vehicle Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Year *</label>
                        <input
                          type="text"
                          required
                          value={manualFormData.vehicleYear}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, vehicleYear: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Make *</label>
                        <input
                          type="text"
                          required
                          value={manualFormData.vehicleMake}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, vehicleMake: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Model *</label>
                        <input
                          type="text"
                          required
                          value={manualFormData.vehicleModel}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle VIN *</label>
                        <input
                          type="text"
                          required
                          value={manualFormData.vehicleVin}
                          onChange={(e) => setManualFormData(prev => ({ ...prev, vehicleVin: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-8 mt-8 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => router.push('/dashboard/loans')}
                      className="px-6 py-3 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 transition-colors"
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
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Create Loan</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </UserLayout>
    </RoleRedirect>
  );
}