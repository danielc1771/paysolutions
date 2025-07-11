'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import UserLayout from '@/components/UserLayout';
import { RoleRedirect } from '@/components/auth/RoleRedirect';
import { createClient } from '@/utils/supabase/client';
import { getAvailableTerms, calculateLoanPayment, generateWeeklyPaymentSchedule } from '@/utils/loan-calculations';
import { Calculator, DollarSign } from 'lucide-react';

export default function CreateLoan() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('send-application');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [createdLoanId, setCreatedLoanId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [organizationInfo, setOrganizationInfo] = useState<any>(null);
  const supabase = createClient();

  // Send Application Form State (no longer includes dealer info)
  const [sendFormData, setSendFormData] = useState({
    customerName: '',
    customerEmail: '',
    loanAmount: '',
    loanTerm: '4', // Default to 4 weeks
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
    interestRate: '30',
    termWeeks: '4',
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

    try {
      const response = await fetch('/api/loans/send-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: sendFormData.customerName,
          customerEmail: sendFormData.customerEmail,
          loanAmount: sendFormData.loanAmount,
          loanTerm: parseInt(sendFormData.loanTerm),
          vehicleYear: sendFormData.vehicleYear,
          vehicleMake: sendFormData.vehicleMake,
          vehicleModel: sendFormData.vehicleModel,
          vehicleVin: sendFormData.vehicleVin,
          dealerName: organizationInfo?.name || '',
          dealerEmail: organizationInfo?.email || '',
          dealerPhone: organizationInfo?.phone || '',
          loanTerm: 12,
          loanAmount: sendFormData.loanAmount,
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

      setSuccessMessage(`Application sent successfully! Application URL: ${result.applicationUrl}`);
      setCreatedLoanId(result.loanId || null);
      setShowSuccessModal(true);
      setSendFormData({
        customerName: '',
        customerEmail: '',
        loanAmount: '',
        loanTerm: '4',
        vehicleYear: '',
        vehicleMake: '',
        vehicleModel: '',
        vehicleVin: ''
      });

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

      setSuccessMessage('Loan created successfully!');
      setCreatedLoanId(result.loanId || null);
      setShowSuccessModal(true);
      
      // Reset form
      setManualFormData({
        firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '',
        addressLine1: '', city: '', state: '', zipCode: '', employmentStatus: '',
        annualIncome: '', currentEmployerName: '', timeWithEmployment: '',
        principalAmount: '', interestRate: '30', termWeeks: '4',
        vehicleYear: '', vehicleMake: '', vehicleModel: '', vehicleVin: '',
        dealerName: '', dealerEmail: '', dealerPhone: '',
        reference1Name: '', reference1Phone: '', reference1Email: '',
        reference2Name: '', reference2Phone: '', reference2Email: '',
        reference3Name: '', reference3Phone: '', reference3Email: ''
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const loanAmountOptions = ['1000', '1500', '2000', '2500', '2999'];

  // Calculate available terms and payment details for send application
  const availableTerms = useMemo(() => {
    if (!sendFormData.loanAmount) return [];
    return getAvailableTerms(parseFloat(sendFormData.loanAmount)).map(term => ({
      value: term.weeks.toString(),
      label: term.label
    }));
  }, [sendFormData.loanAmount]);

  const loanCalculation = useMemo(() => {
    if (!sendFormData.loanAmount || !sendFormData.loanTerm) return null;
    return calculateLoanPayment(parseFloat(sendFormData.loanAmount), parseInt(sendFormData.loanTerm));
  }, [sendFormData.loanAmount, sendFormData.loanTerm]);

  const paymentSchedule = useMemo(() => {
    if (!loanCalculation) return [];
    return generateWeeklyPaymentSchedule(loanCalculation);
  }, [loanCalculation]);

  // Calculate available terms and payment details for manual entry
  const availableTermsManual = useMemo(() => {
    if (!manualFormData.principalAmount) return [];
    return getAvailableTerms(parseFloat(manualFormData.principalAmount)).map(term => ({
      value: term.weeks.toString(),
      label: term.label
    }));
  }, [manualFormData.principalAmount]);

  const loanCalculationManual = useMemo(() => {
    if (!manualFormData.principalAmount || !manualFormData.termWeeks) return null;
    return calculateLoanPayment(parseFloat(manualFormData.principalAmount), parseInt(manualFormData.termWeeks));
  }, [manualFormData.principalAmount, manualFormData.termWeeks]);

  // Handle loan amount change to reset term if invalid
  const handleLoanAmountChange = (newAmount: string) => {
    setSendFormData(prev => ({ ...prev, loanAmount: newAmount }));
    if (newAmount) {
      const terms = getAvailableTerms(parseFloat(newAmount));
      if (terms.length > 0 && !terms.some(t => t.weeks.toString() === sendFormData.loanTerm)) {
        setSendFormData(prev => ({ ...prev, loanTerm: '4' })); // Default to 4 weeks
      }
    }
  };

  // Handle principal amount change for manual entry
  const handlePrincipalAmountChange = (newAmount: string) => {
    const updatedFormData = { ...manualFormData, principalAmount: newAmount };
    
    if (newAmount) {
      const terms = getAvailableTerms(parseFloat(newAmount));
      if (terms.length > 0 && !terms.some(t => t.weeks.toString() === manualFormData.termWeeks)) {
        updatedFormData.termWeeks = '4'; // Default to 4 weeks
      }
    }
    
    setManualFormData(updatedFormData);
  };

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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSendFormData(prev => ({ ...prev, customerName: e.target.value }))}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSendFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="john@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount *</label>
                        <select
                          required
                          value={sendFormData.loanAmount}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleLoanAmountChange(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        >
                          <option value="">Select loan amount</option>
                          {loanAmountOptions.map(amount => (
                            <option key={amount} value={amount}>${parseInt(amount).toLocaleString()}</option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Loan Term Selection */}
                      {sendFormData.loanAmount && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Loan Term *</label>
                          <select
                            required
                            value={sendFormData.loanTerm}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSendFormData(prev => ({ ...prev, loanTerm: e.target.value }))}
                            className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          >
                            {availableTerms.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSendFormData(prev => ({ ...prev, vehicleYear: e.target.value }))}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSendFormData(prev => ({ ...prev, vehicleMake: e.target.value }))}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSendFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSendFormData(prev => ({ ...prev, vehicleVin: e.target.value }))}
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

                  {/* Payment Preview - Moved to bottom */}
                  {loanCalculation && (
                    <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-2xl border border-green-200 mt-8">
                      <div className="flex items-center mb-4">
                        <Calculator className="w-5 h-5 text-green-600 mr-2" />
                        <h3 className="text-lg font-semibold text-gray-900">Payment Preview</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-white/60 p-4 rounded-xl">
                          <div className="flex items-center mb-2">
                            <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                            <span className="text-sm font-medium text-gray-600">Weekly Payment</span>
                          </div>
                          <p className="text-2xl font-bold text-green-600">${loanCalculation.weeklyPayment.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/60 p-4 rounded-xl">
                          <div className="text-sm font-medium text-gray-600 mb-2">Total Interest</div>
                          <p className="text-xl font-semibold text-orange-600">${loanCalculation.totalInterest.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/60 p-4 rounded-xl">
                          <div className="text-sm font-medium text-gray-600 mb-2">Total Payment</div>
                          <p className="text-xl font-semibold text-blue-600">${loanCalculation.totalPayment.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      {/* Payment Schedule Table */}
                      <div className="bg-white/80 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50">
                          <h4 className="font-semibold text-gray-900">Payment Schedule ({loanCalculation.termWeeks} weeks)</h4>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left font-semibold text-gray-900">#</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-900">Due Date</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-900">Payment</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-900">Principal</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-900">Interest</th>
                                <th className="px-3 py-2 text-right font-semibold text-gray-900">Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {paymentSchedule.map((payment, index) => (
                                <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                                  <td className="px-3 py-2 font-semibold text-gray-900">{payment.paymentNumber}</td>
                                  <td className="px-3 py-2 text-gray-800">{new Date(payment.dueDate).toLocaleDateString()}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-gray-900">${payment.totalPayment.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right text-gray-800">${payment.principalAmount.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right text-gray-800">${payment.interestAmount.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right text-gray-800">${payment.remainingBalance.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                        <input
                          type="text"
                          required
                          value={manualFormData.lastName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input
                          type="email"
                          required
                          value={manualFormData.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input
                          type="tel"
                          value={manualFormData.phone}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                        <input
                          type="date"
                          value={manualFormData.dateOfBirth}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <input
                          type="text"
                          value={manualFormData.addressLine1}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, addressLine1: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="123 Main Street"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                        <input
                          type="text"
                          value={manualFormData.city}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                        <input
                          type="text"
                          value={manualFormData.state}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                        <input
                          type="text"
                          value={manualFormData.zipCode}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status</label>
                        <select
                          value={manualFormData.employmentStatus}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setManualFormData(prev => ({ ...prev, employmentStatus: e.target.value }))}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, annualIncome: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="50000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Employer</label>
                        <input
                          type="text"
                          value={manualFormData.currentEmployerName}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, currentEmployerName: e.target.value }))}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePrincipalAmountChange(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          placeholder="1000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (Fixed)</label>
                        <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-2xl text-gray-700">
                          30% Annual (Fixed)
                        </div>
                      </div>

                      {availableTermsManual.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Term (Weeks) *</label>
                          <select
                            required
                            value={manualFormData.termWeeks}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setManualFormData(prev => ({ ...prev, termWeeks: e.target.value }))}
                            className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                          >
                            {availableTermsManual.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {loanCalculationManual && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Payment</label>
                          <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-2xl text-gray-700">
                            ${loanCalculationManual.weeklyPayment.toFixed(2)}
                          </div>
                        </div>
                      )}
                      
                      {loanCalculationManual && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Total Payment</label>
                          <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-2xl text-gray-700">
                            ${loanCalculationManual.totalPayment.toFixed(2)}
                          </div>
                        </div>
                      )}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, vehicleYear: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Make *</label>
                        <input
                          type="text"
                          required
                          value={manualFormData.vehicleMake}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, vehicleMake: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Model *</label>
                        <input
                          type="text"
                          required
                          value={manualFormData.vehicleModel}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, vehicleModel: e.target.value }))}
                          className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle VIN *</label>
                        <input
                          type="text"
                          required
                          value={manualFormData.vehicleVin}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManualFormData(prev => ({ ...prev, vehicleVin: e.target.value }))}
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

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-96 border border-white/20">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Success!</h2>
                <p className="text-gray-600 mb-6">{successMessage}</p>
                <div className="flex flex-col space-y-3">
                  <button
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold py-3 px-6 rounded-2xl hover:from-green-600 hover:to-teal-600 transition-all duration-300"
                    onClick={() => {
                      setShowSuccessModal(false);
                      router.push('/dashboard/loans');
                    }}
                  >
                    View All Loans
                  </button>
                  {createdLoanId && (
                    <button
                      className="w-full bg-white text-green-600 border border-green-600 font-semibold py-3 px-6 rounded-2xl hover:bg-green-50 transition-all duration-300"
                      onClick={() => {
                        setShowSuccessModal(false);
                        router.push(`/dashboard/loans/${createdLoanId}`);
                      }}
                    >
                      View Loan Details
                    </button>
                  )}
                  <button
                    className="w-full bg-gray-200 text-gray-900 font-semibold py-3 px-6 rounded-2xl hover:bg-gray-300 transition-all duration-300"
                    onClick={() => {
                      setShowSuccessModal(false);
                    }}
                  >
                    Create Another Loan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </UserLayout>
    </RoleRedirect>
  );
}