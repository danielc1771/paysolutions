'use client';

import UserLayout from '@/components/UserLayout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { CheckCircle, ExternalLink, ArrowLeft, Send, Clock, FileText } from 'lucide-react';
import { RoleRedirect } from '@/components/auth/RoleRedirect';
import { createClient } from '@/utils/supabase/client';

interface LoanDetailProps {
  params: Promise<{ id: string }>;
}

interface Loan {
  id: string;
  loan_number: string;
  borrower: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    address_line1: string;
    city: string;
    state: string;
    zip_code: string;
    employment_status: string;
    annual_income: string;
    current_employer_name: string;
    time_with_employment: string;
    reference1_name: string;
    reference1_phone: string;
    reference1_email: string;
    reference2_name: string;
    reference2_phone: string;
    reference2_email: string;
    reference3_name: string;
    reference3_phone: string;
    reference3_email: string;
    kyc_status: string;
  };
  principal_amount: string;
  interest_rate: string;
  term_weeks: string;
  weekly_payment: string;
  purpose: string;
  created_at: string;
  funding_date: string;
  status: string;
  docusign_status: string;
  docusign_envelope_id: string;
  remaining_balance: string;
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_vin: string;
}

export default function LoanDetail({ params }: LoanDetailProps) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docusignLoading, setDocusignLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const fetchLoan = async () => {
      try {
        setLoading(true);
        const { id } = await params;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('User not authenticated');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!profile?.organization_id) {
          setError('Organization not found');
          return;
        }

        const { data, error } = await supabase
          .from('loans')
          .select(`
            *,
            borrower:borrowers(
              first_name,
              last_name,
              email,
              phone,
              date_of_birth,
              address_line1,
              city,
              state,
              zip_code,
              employment_status,
              annual_income,
              current_employer_name,
              time_with_employment,
              reference1_name,
              reference1_phone,
              reference1_email,
              reference2_name,
              reference2_phone,
              reference2_email,
              reference3_name,
              reference3_phone,
              reference3_email,
              kyc_status
            )
          `)
          .eq('id', id)
          .eq('organization_id', profile.organization_id)
          .single();

        if (error) {
          setError(error.message);
        } else {
          setLoan(data);
        }
      } catch (err) {
        setError('Failed to fetch loan details');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLoan();
  }, [params, supabase]);

  const handleSendDocuSign = async () => {
    if (!loan) return;

    setDocusignLoading(true);
    try {
      const response = await fetch('/api/docusign/envelope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loanId: loan.id }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('DocuSign agreement sent successfully! The borrower will receive an email with the document to sign.');
        setShowSuccessModal(true);
        
        // Refresh loan data
        const { data: updatedLoan } = await supabase
          .from('loans')
          .select(`
            *,
            borrower:borrowers(
              first_name,
              last_name,
              email,
              phone,
              date_of_birth,
              address_line1,
              city,
              state,
              zip_code,
              employment_status,
              annual_income,
              current_employer_name,
              time_with_employment,
              reference1_name,
              reference1_phone,
              reference1_email,
              reference2_name,
              reference2_phone,
              reference2_email,
              reference3_name,
              reference3_phone,
              reference3_email,
              kyc_status
            )
          `)
          .eq('id', loan.id)
          .single();
        
        if (updatedLoan) {
          setLoan(updatedLoan);
        }
      } else {
        alert('Failed to send DocuSign agreement: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error sending DocuSign:', error);
      alert('Failed to send DocuSign agreement');
    } finally {
      setDocusignLoading(false);
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'new': return 'New';
      case 'application_sent': return 'Application Sent';
      case 'application_completed': return 'Application Completed';
      case 'review': return 'Under Review';
      case 'signed': return 'Signed - Ready for Funding';
      case 'funded': return 'Funded';
      case 'active': return 'Active';
      case 'closed': return 'Closed';
      default: return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'application_sent': return 'bg-yellow-100 text-yellow-800';
      case 'application_completed': return 'bg-orange-100 text-orange-800';
      case 'review': return 'bg-orange-100 text-orange-800';
      case 'signed': return 'bg-emerald-100 text-emerald-800';
      case 'funded': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  if (loading) {
    return (
      <RoleRedirect allowedRoles={['user']}>
        <UserLayout>
          <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading loan details...</p>
            </div>
          </div>
        </UserLayout>
      </RoleRedirect>
    );
  }

  if (error || !loan) {
    return (
      <RoleRedirect allowedRoles={['user']}>
        <UserLayout>
          <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loan not found</h3>
              <p className="text-red-600 mb-4">{error || 'Loan does not exist or you do not have permission to view it'}</p>
              <Link
                href="/dashboard/loans"
                className="bg-green-500 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-green-600 transition-colors"
              >
                Back to Loans
              </Link>
            </div>
          </div>
        </UserLayout>
      </RoleRedirect>
    );
  }

  return (
    <RoleRedirect allowedRoles={['user']}>
      <UserLayout>
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Link
                    href="/dashboard/loans"
                    className="p-2 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 transition-all duration-300"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </Link>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
                      {loan.loan_number}
                    </h1>
                    <p className="text-gray-600 text-lg">
                      {loan.borrower.first_name} {loan.borrower.last_name} • {loan.vehicle_year} {loan.vehicle_make} {loan.vehicle_model}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                    {formatStatus(loan.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Loan Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Loan Information */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Loan Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Principal Amount</label>
                      <p className="text-2xl font-bold text-green-600">${parseFloat(loan.principal_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate</label>
                      <p className="text-lg font-semibold text-gray-900">{(parseFloat(loan.interest_rate) * 100).toFixed(2)}%</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                      <p className="text-lg font-semibold text-gray-900">{loan.term_weeks} weeks</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Weekly Payment</label>
                      <p className="text-lg font-semibold text-gray-900">${parseFloat(loan.weekly_payment).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Vehicle Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle</label>
                      <p className="text-lg font-semibold text-gray-900">{loan.vehicle_year} {loan.vehicle_make} {loan.vehicle_model}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">VIN</label>
                      <p className="text-lg font-mono text-gray-900">{loan.vehicle_vin}</p>
                    </div>
                  </div>
                </div>

                {/* Borrower Information */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Borrower Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <p className="text-lg font-semibold text-gray-900">{loan.borrower.first_name} {loan.borrower.last_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <p className="text-lg text-gray-900">{loan.borrower.phone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                      <p className="text-lg text-gray-900">{loan.borrower.date_of_birth ? new Date(loan.borrower.date_of_birth).toLocaleDateString() : 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <p className="text-lg text-gray-900">
                        {loan.borrower.address_line1}<br />
                        {loan.borrower.city}, {loan.borrower.state} {loan.borrower.zip_code}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status</label>
                      <p className="text-lg text-gray-900">{loan.borrower.employment_status}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Annual Income</label>
                      <p className="text-lg text-gray-900">${parseFloat(loan.borrower.annual_income).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Employment Details */}
                {(loan.borrower.current_employer_name || loan.borrower.time_with_employment) && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Employment Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {loan.borrower.current_employer_name && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Current Employer</label>
                          <p className="text-lg text-gray-900">{loan.borrower.current_employer_name}</p>
                        </div>
                      )}
                      {loan.borrower.time_with_employment && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Time with Employment</label>
                          <p className="text-lg text-gray-900">{loan.borrower.time_with_employment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* References */}
                {(loan.borrower.reference1_name || loan.borrower.reference2_name || loan.borrower.reference3_name) && (
                  <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">References</h2>
                    <div className="space-y-6">
                      {loan.borrower.reference1_name && (
                        <div className="border-b border-gray-200 pb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Reference 1</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                              <p className="text-gray-900">{loan.borrower.reference1_name}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                              <p className="text-gray-900">{loan.borrower.reference1_phone || 'Not provided'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                              <p className="text-gray-900">{loan.borrower.reference1_email || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {loan.borrower.reference2_name && (
                        <div className="border-b border-gray-200 pb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Reference 2</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                              <p className="text-gray-900">{loan.borrower.reference2_name}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                              <p className="text-gray-900">{loan.borrower.reference2_phone || 'Not provided'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                              <p className="text-gray-900">{loan.borrower.reference2_email || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {loan.borrower.reference3_name && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Reference 3</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                              <p className="text-gray-900">{loan.borrower.reference3_name}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                              <p className="text-gray-900">{loan.borrower.reference3_phone || 'Not provided'}</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                              <p className="text-gray-900">{loan.borrower.reference3_email || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Actions */}
              <div className="space-y-6">
                {/* DocuSign Actions */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Document Management</h3>
                  
                  {loan.docusign_status === 'not_sent' && (
                    <div className="space-y-4">
                      {loan.status === 'application_completed' ? (
                        <>
                          <p className="text-sm text-gray-600">Application complete. Ready to send loan agreement for signature</p>
                          <button
                            onClick={handleSendDocuSign}
                            disabled={docusignLoading}
                            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                          >
                            {docusignLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Send DocuSign Agreement</span>
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">Application must be completed before sending DocuSign agreement</p>
                          <button
                            disabled
                            className="w-full bg-gray-300 text-gray-500 px-6 py-3 rounded-2xl font-semibold cursor-not-allowed flex items-center justify-center space-x-2"
                          >
                            <Send className="w-4 h-4" />
                            <span>Send DocuSign Agreement</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {loan.docusign_status === 'sent' && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-yellow-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Waiting for signature</span>
                      </div>
                      <p className="text-sm text-gray-600">Agreement sent to borrower. Awaiting their signature.</p>
                    </div>
                  )}

                  {loan.docusign_status === 'signed' && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Document signed</span>
                      </div>
                      <p className="text-sm text-gray-600">Agreement has been signed by the borrower.</p>
                      {loan.docusign_envelope_id && (
                        <a
                          href={`https://demo.docusign.net/documents/${loan.docusign_envelope_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View in DocuSign</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Loan Timeline */}
                <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Loan Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Loan Created</p>
                        <p className="text-xs text-gray-500">
                          {new Date(loan.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    {loan.docusign_status !== 'not_sent' && (
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                          <FileText className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Agreement Sent</p>
                          <p className="text-xs text-gray-500">DocuSign envelope created</p>
                        </div>
                      </div>
                    )}
                    
                    {loan.docusign_status === 'signed' && (
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Document Signed</p>
                          <p className="text-xs text-gray-500">Ready for funding</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-96 border border-white/20">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Success!</h2>
                <p className="text-gray-600 mb-6">{successMessage}</p>
                <button
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold py-3 px-6 rounded-2xl hover:from-green-600 hover:to-teal-600 transition-all duration-300"
                  onClick={() => setShowSuccessModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </UserLayout>
    </RoleRedirect>
  );
}