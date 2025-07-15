'use client';

import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { CheckCircle, ExternalLink, CreditCard, Copy, Mail } from 'lucide-react';
import { LoanWithBorrower } from '@/types/loan';

interface LoanDetailProps {
  params: Promise<{ id: string }>;
}

// Generate payment schedule
function generatePaymentSchedule(loan: LoanWithBorrower) {
  const schedule = [];
  const weeklyPayment = parseFloat(loan.weekly_payment);
  const principalAmount = parseFloat(loan.principal_amount);
  const annualRate = parseFloat(loan.interest_rate);
  const weeklyRate = annualRate / 12;
  const termWeeks = loan.term_weeks;
  
  let remainingBalance = principalAmount;
  const startDate = new Date(loan.funding_date || loan.created_at);
  
  for (let i = 1; i <= termWeeks; i++) {
    const paymentDate = new Date(startDate);
    paymentDate.setDate(paymentDate.getDate() + (i * 7));
    
    const interestPayment = remainingBalance * weeklyRate;
    const principalPayment = weeklyPayment - interestPayment;
    remainingBalance = Math.max(0, remainingBalance - principalPayment);
    
    schedule.push({
      paymentNumber: i,
      dueDate: paymentDate.toISOString().split('T')[0],
      principalPayment: principalPayment.toFixed(2),
      interestPayment: interestPayment.toFixed(2),
      totalPayment: weeklyPayment.toFixed(2),
      remainingBalance: remainingBalance.toFixed(2),
      status: 'pending' // Will be updated based on actual payments
    });
  }
  
  return schedule;
}

export default function LoanDetail({ params }: LoanDetailProps) {
  const [loan, setLoan] = useState<LoanWithBorrower | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docusignLoading, setDocusignLoading] = useState(false);
  const [approvingLoan, setApprovingLoan] = useState(false);
  const [settingUpPayments, setSettingUpPayments] = useState(false);
  const [viewingDocuSign, setViewingDocuSign] = useState(false);
  const [copyingLink, setCopyingLink] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Function to fetch/refetch loan data
  const fetchLoanData = async () => {
    try {
      const { id } = await params;
      const response = await fetch(`/api/loans/${id}`);
      const result = await response.json();

      if (response.ok) {
        setLoan(result.loan);
        setError(null);
      } else {
        setError(result.error || 'Failed to load loan');
      }
    } catch (err) {
      setError('Failed to load loan');
      console.error('Error fetching loan:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLoanData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove fetchLoanData dependency to prevent infinite loop

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
        // Refresh the page to show updated status
        window.location.reload();
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

  const handleViewInDocuSign = async () => {
    if (!loan?.docusign_envelope_id) {
      alert('No DocuSign envelope found for this loan');
      return;
    }

    setViewingDocuSign(true);
    try {
      const response = await fetch(`/api/docusign/envelope/${loan.docusign_envelope_id}/view`);
      const data = await response.json();
      
      if (data.success && data.viewUrl) {
        // Open the authenticated DocuSign viewing URL
        window.open(data.viewUrl, '_blank');
      } else {
        console.error('DocuSign view error:', data.error);
        alert('Failed to open DocuSign view: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error getting DocuSign view URL:', error);
      alert('Failed to open DocuSign view. Please try again or contact support.');
    } finally {
      setViewingDocuSign(false);
    }
  };


  const handleApproveLoan = async () => {
    setApprovingLoan(true);
    try {
      const response = await fetch(`/api/loans/${loan?.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to approve loan');
      }

      // Refresh loan data to show updated status
      fetchLoanData();
      
      alert('Loan approved successfully! Ready for funding.');
    } catch (error) {
      console.error('Error approving loan:', error);
      alert('Failed to approve loan. Please try again.');
    } finally {
      setApprovingLoan(false);
    }
  };

  const handleSetupStripePayments = async () => {
    setSettingUpPayments(true);
    try {
      console.log('🚀 Redirecting to payment collection page for loan:', loan?.id);
      
      // Redirect to the new comprehensive payment collection page
      window.open(`/payment-collection/${loan?.id}`, '_blank');
    } catch (error) {
      console.error('💥 Navigation error:', error);
      alert('Failed to open payment collection page. Please try again.');
    } finally {
      setSettingUpPayments(false);
    }
  };

  const handleCopyPaymentSummaryLink = async () => {
    setCopyingLink(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const paymentSummaryUrl = `${baseUrl}/payment-summary/${loan?.id}`;
      
      await navigator.clipboard.writeText(paymentSummaryUrl);
      alert('Payment summary link copied to clipboard!');
    } catch (error) {
      console.error('Error copying link:', error);
      alert('Failed to copy link. Please try again.');
    } finally {
      setCopyingLink(false);
    }
  };

  const handleEmailPaymentSummary = async () => {
    setSendingEmail(true);
    try {
      const response = await fetch(`/api/loans/${loan?.id}/send-payment-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to send payment summary email');
      }

      alert('Payment summary email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };


  const isDocuSignCompleted = (status: string) => {
    return status?.toLowerCase() === 'completed' || status?.toLowerCase() === 'signed';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !loan) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600">{error || 'Loan not found'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Generate payment schedule
  const paymentSchedule = generatePaymentSchedule(loan);

  // Calculate loan progress
  const totalLoanAmount = parseFloat(loan.principal_amount);
  const remainingBalance = parseFloat(loan.remaining_balance || loan.principal_amount);
  const paidAmount = totalLoanAmount - remainingBalance;
  const progressPercentage = (paidAmount / totalLoanAmount) * 100;


  return (
    <AdminLayout>
      <div className="px-8 py-8 max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/admin/loans"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Loans
          </Link>
        </div>

        {/* Page Header */}
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Loan #{loan.loan_number}
                </h1>
                <p className="text-gray-600 mt-2 text-lg">
                  {loan.borrower.first_name} {loan.borrower.last_name}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex space-x-4">
                  <button 
                    onClick={handleSendDocuSign}
                    disabled={docusignLoading || isDocuSignCompleted(loan.docusign_status)}
                    className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                      isDocuSignCompleted(loan.docusign_status) 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : loan.docusign_status === 'sent'
                        ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {docusignLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Sending...
                      </div>
                    ) : isDocuSignCompleted(loan.docusign_status) ? (
                      '✅ Agreement Signed'
                    ) : loan.docusign_status === 'sent' ? (
                      '📄 Awaiting Signature'
                    ) : (
                      'Send DocuSign Agreement'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Funding Status */}
          {loan.status === 'funded' && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-xl shadow-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-bold text-green-800 mb-2">✅ Loan Approved & Funded</h3>
                  <p className="text-green-700 mb-4 text-sm">
                    This loan has been approved and funded. Payment collection is now active.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleSetupStripePayments}
                      disabled={settingUpPayments}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold shadow-md transition-all"
                    >
                      {settingUpPayments ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Manually Input Customer Payments
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleEmailPaymentSummary}
                      disabled={sendingEmail}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold shadow-md transition-all"
                    >
                      {sendingEmail ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          Send Payment Request
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCopyPaymentSummaryLink}
                      disabled={copyingLink}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold shadow-md transition-all"
                    >
                      {copyingLink ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Copying...
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Share Payment Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Approval Section - Moved to top for high visibility */}
          {isDocuSignCompleted(loan.docusign_status) && loan.status !== 'funded' && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400 rounded-xl shadow-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-bold text-orange-800 mb-2">🚨 Admin Approval Required</h3>
                  <p className="text-orange-700 mb-4 text-sm">
                    The loan agreement has been signed by the borrower. Please review all documents and approve this loan to proceed with funding.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleApproveLoan}
                      disabled={approvingLoan}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold shadow-md transition-all"
                    >
                      {approvingLoan ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Approving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Approve Loan for Funding
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleViewInDocuSign}
                      disabled={viewingDocuSign}
                      className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md transition-all"
                    >
                      {viewingDocuSign ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Opening...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          Review in DocuSign
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loan Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Loan Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  ${totalLoanAmount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 font-medium">Principal Amount</div>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  ${paidAmount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 font-medium">Amount Paid</div>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  ${remainingBalance.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 font-medium">Remaining Balance</div>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {progressPercentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 font-medium">Complete</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-8">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Loan Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Loan Details</h2>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Loan Number:</span>
                  <span className="font-semibold text-gray-900">{loan.loan_number}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Principal Amount:</span>
                  <span className="font-semibold text-gray-900">${parseFloat(loan.principal_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Interest Rate:</span>
                  <span className="font-semibold text-gray-900">{(parseFloat(loan.interest_rate) * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Term:</span>
                  <span className="font-semibold text-gray-900">{loan.term_weeks} weeks</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Weekly Payment:</span>
                  <span className="font-semibold text-gray-900">${parseFloat(loan.weekly_payment).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Purpose:</span>
                  <span className="font-semibold text-gray-900">{loan.purpose}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Application Date:</span>
                  <span className="font-semibold text-gray-900">{new Date(loan.created_at).toLocaleDateString()}</span>
                </div>
                {loan.funding_date && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600 font-medium">Funding Date:</span>
                    <span className="font-semibold text-gray-900">{new Date(loan.funding_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Borrower Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Borrower Information</h2>
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Name:</span>
                  <span className="font-semibold text-gray-900">{loan.borrower.first_name} {loan.borrower.last_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Email:</span>
                  <span className="font-semibold text-gray-900">{loan.borrower.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Phone:</span>
                  <span className="font-semibold text-gray-900">{loan.borrower.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Date of Birth:</span>
                  <span className="font-semibold text-gray-900">{loan.borrower.date_of_birth ? new Date(loan.borrower.date_of_birth).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Address:</span>
                  <span className="font-semibold text-gray-900 text-right">
                    {loan.borrower.address_line1}<br />
                    {loan.borrower.city}, {loan.borrower.state} {loan.borrower.zip_code}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Employment:</span>
                  <span className="font-semibold text-gray-900">{loan.borrower.employment_status || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-600 font-medium">Annual Income:</span>
                  <span className="font-semibold text-gray-900">
                    {loan.borrower.annual_income ? `$${parseFloat(loan.borrower.annual_income).toLocaleString()}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 font-medium">KYC Status:</span>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800`}>
                    {loan.borrower.kyc_status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Schedule</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Payment #
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Principal
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Interest
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total Payment
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Remaining Balance
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paymentSchedule.slice(0, 12).map((payment) => (
                    <tr key={payment.paymentNumber} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {payment.paymentNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(payment.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        ${payment.principalPayment}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        ${payment.interestPayment}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${payment.totalPayment}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        ${payment.remainingBalance}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paymentSchedule.length > 12 && (
              <div className="mt-6 text-center">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors">
                  View All {paymentSchedule.length} Payments
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
