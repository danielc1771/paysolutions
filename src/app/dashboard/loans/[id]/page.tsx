'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { CheckCircle, ArrowLeft, Send, DollarSign } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { LoanWithBorrower } from '@/types/loan';
import { Invoice } from '@/app/api/loans/[id]/invoices/route';
import { SigningProgressIndicator } from '@/components/SigningProgressIndicator';
import { formatLoanStatus } from '@/utils/formatters';
import { useUserProfile } from '@/components/auth/RoleRedirect';

interface LoanDetailProps {
  params: Promise<{ id: string }>;
}

export default function LoanDetail({ params }: LoanDetailProps) {
  const [loan, setLoan] = useState<LoanWithBorrower | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docusignLoading, setDocusignLoading] = useState(false);
  const [fundingLoading, setFundingLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { profile } = useUserProfile();
  const isAdmin = profile?.role === 'admin';

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

        let query = supabase
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
          .eq('id', id);

        // For non-admin users, filter by organization
        if (!isAdmin) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', user.id)
            .single();

          if (!userProfile?.organization_id) {
            setError('Organization not found');
            return;
          }

          query = query.eq('organization_id', userProfile.organization_id);
        }

        const { data, error } = await query.single();

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

    if (profile) {
      fetchLoan();
    }
  }, [params, supabase, isAdmin, profile]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!loan || loan.status !== 'funded') return;
      
      setInvoicesLoading(true);
      try {
        const response = await fetch(`/api/loans/${loan.id}/invoices`);
        const data = await response.json();
        
        if (data.success) {
          setInvoices(data.invoices);
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setInvoicesLoading(false);
      }
    };

    fetchInvoices();
  }, [loan]);

  const handleSignDocuSign = async (signerType: 'ipay' | 'organization' = 'organization') => {
    if (!loan) return;

    setDocusignLoading(true);
    try {
      // First, ensure DocuSign envelope exists
      if (!loan.docusign_envelope_id) {
        console.log('📝 No envelope found, creating new envelope...');
        const createResponse = await fetch('/api/docusign/create-envelope', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ loanId: loan.id }),
        });

        const createData = await createResponse.json();
        
        if (!createData.success) {
          alert('Failed to create DocuSign envelope: ' + (createData.error || 'Unknown error'));
          return;
        }

        console.log('✅ Envelope created:', createData.envelopeId);
        
        // Refresh the page to get updated loan data with envelope ID
        window.location.reload();
        return;
      } else {
        console.log('📋 Envelope already exists:', loan.docusign_envelope_id);
      }
      
      console.log('🔗 Requesting signing URL for', signerType, '...');
      const response = await fetch('/api/docusign/signing-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          loanId: loan.id,
          signerType: signerType
        }),
      });

      const data = await response.json();
      
      if (data.success && data.signingUrl) {
        console.log('✅ Redirecting to DocuSign...');
        // Redirect to DocuSign embedded recipient view
        window.location.href = data.signingUrl;
      } else {
        console.error('❌ Failed to get signing URL:', data);
        alert('Failed to get DocuSign signing URL: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error getting DocuSign signing URL:', error);
      alert('Failed to get DocuSign signing URL');
    } finally {
      setDocusignLoading(false);
    }
  };

  const handleFundLoan = async () => {
    if (!loan) return;

    setFundingLoading(true);
    try {
      const response = await fetch(`/api/loans/${loan.id}/fund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(data.message || 'Loan funded successfully! The borrower will receive an email invoice for their first payment.');
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
        alert('Failed to fund loan: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error funding loan:', error);
      alert('Failed to fund loan. Please try again.');
    } finally {
      setFundingLoading(false);
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading loan details...</p>
            </div>
          </div>
    );
  }

  if (error || !loan) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
          <div className="p-6">
            {/* Back Button */}
            <Link
              href="/dashboard/loans"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Loans
            </Link>

            {/* Borrower Contact Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                    {loan.borrower.first_name[0]}{loan.borrower.last_name[0]}
                  </div>
                  
                  {/* Info */}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                      {loan.borrower.first_name} {loan.borrower.last_name}
                    </h1>
                    <p className="text-sm text-gray-500 mb-3">Loan #{loan.loan_number}</p>
                    
                    {/* Quick Actions */}
                    <div className="flex items-center space-x-2">
                      <a
                        href={`mailto:${loan.borrower.email}`}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center space-x-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Email</span>
                      </a>
                      <a
                        href={`tel:${loan.borrower.phone}`}
                        className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors flex items-center space-x-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                </div>
                
                {/* Status Badge */}
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                  {formatLoanStatus(loan.status)}
                </span>
              </div>
            </div>

            {/* Enhanced Three-Stage Signing Progress Tracker */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Document Signing Progress</h3>
              <SigningProgressIndicator
                ipayStatus={loan.ipay_signed_at ? 'completed' : 'pending'}
                organizationStatus={loan.organization_signed_at ? 'completed' : loan.ipay_signed_at ? 'pending' : undefined}
                borrowerStatus={loan.borrower_signed_at ? 'completed' : loan.organization_signed_at ? 'pending' : undefined}
                showLabels={true}
                size="lg"
              />

              {/* Additional status information */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  {!loan.ipay_signed_at && (
                    <p>📝 Awaiting iPay Admin to sign and send the agreement.</p>
                  )}
                  {loan.ipay_signed_at && !loan.organization_signed_at && (
                    <p>✍️ Ready for your signature! Click &quot;Sign Agreement Now&quot; below to complete your signature.</p>
                  )}
                  {loan.organization_signed_at && !loan.borrower_signed_at && (
                    <p>✉️ Awaiting Borrower signature. Email has been sent to {loan.borrower?.email}</p>
                  )}
                  {loan.borrower_signed_at && (
                    <p>✅ All parties have signed. Document is fully executed and ready for funding.</p>
                  )}
                </div>

                {/* Show signing timestamps if available */}
                {(loan.ipay_signed_at || loan.organization_signed_at || loan.borrower_signed_at) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Signature Timeline:</p>
                    {loan.ipay_signed_at && (
                      <p className="text-xs text-gray-500">
                        ✅ iPay Admin: {new Date(loan.ipay_signed_at).toLocaleString()}
                      </p>
                    )}
                    {loan.organization_signed_at && (
                      <p className="text-xs text-gray-500">
                        ✅ Organization: {new Date(loan.organization_signed_at).toLocaleString()}
                      </p>
                    )}
                    {loan.borrower_signed_at && (
                      <p className="text-xs text-gray-500">
                        ✅ Borrower: {new Date(loan.borrower_signed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Legacy Progress Tracker - Hidden but preserved for reference */}
              <div className="hidden">
              <style jsx>{`
                .loan-progress-tracker {
                  --marker-size: 48px;
                  --marker-size-half: calc(var(--marker-size) * 0.5);
                  --path-height: 4px;
                  --path-position-block: calc(var(--marker-size-half) - (var(--path-height) * 0.5));
                  --path-size-inline: calc(100% - var(--marker-size));
                  --path-position-inline: var(--marker-size);
                  
                  --marker-bg: white;
                  --marker-bg-complete: #3b82f6;
                  --marker-bg-active: #60a5fa;
                  --marker-border-color: #d1d5db;
                  --marker-border-complete: #3b82f6;
                  --marker-border-active: #60a5fa;
                  --marker-color: #9ca3af;
                  --marker-color-complete: white;
                  --path-bg: #d1d5db;
                  --path-bg-complete: #3b82f6;
                  
                  display: flex;
                  list-style: none;
                  margin: 0;
                  padding: 0;
                  counter-reset: step;
                }
                
                .loan-progress-step {
                  position: relative;
                  display: flex;
                  flex-direction: column;
                  flex: 1 1 0%;
                  margin: 0;
                  padding: 0;
                }
                
                .loan-progress-step:last-child {
                  flex-grow: 0;
                }
                
                /* Marker circle */
                .loan-progress-step::before {
                  content: counter(step);
                  counter-increment: step;
                  position: relative;
                  z-index: 20;
                  flex-shrink: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  width: var(--marker-size);
                  height: var(--marker-size);
                  border-radius: 50%;
                  background-color: var(--marker-bg);
                  border: 4px solid var(--marker-border-color);
                  color: var(--marker-color);
                  font-weight: 600;
                  font-size: 1.125rem;
                  transition: all 0.3s ease;
                }
                
                /* Connecting line */
                .loan-progress-step:not(:last-child)::after {
                  content: '';
                  display: block;
                  position: absolute;
                  top: var(--path-position-block);
                  left: var(--path-position-inline);
                  width: var(--path-size-inline);
                  height: var(--path-height);
                  background-color: var(--path-bg);
                  transition: background-color 0.5s ease;
                }
                
                /* Complete state */
                .loan-progress-step.is-complete::before {
                  content: '✓';
                  background-color: var(--marker-bg-complete);
                  border-color: var(--marker-border-complete);
                  color: var(--marker-color-complete);
                }
                
                .loan-progress-step.is-complete::after {
                  background-color: var(--path-bg-complete);
                }
                
                /* Active state */
                .loan-progress-step.is-active::before {
                  background-color: var(--marker-bg-active);
                  border-color: var(--marker-border-active);
                  color: var(--marker-color-complete);
                  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                
                @keyframes pulse {
                  0%, 100% {
                    opacity: 1;
                  }
                  50% {
                    opacity: 0.7;
                  }
                }
                
                /* Label below marker */
                .loan-progress-label {
                  margin-top: 0.75rem;
                  padding: 0.5rem;
                  text-align: center;
                  font-size: 0.75rem;
                  font-weight: 600;
                  color: #6b7280;
                  line-height: 1.2;
                }
                
                .loan-progress-step.is-complete .loan-progress-label {
                  color: #111827;
                }
                
                .loan-progress-step.is-active .loan-progress-label {
                  color: #3b82f6;
                }
              `}</style>
              
              <ol className="loan-progress-tracker">
                {/* Step 1: Application Sent */}
                <li className={`loan-progress-step ${
                  loan.status === 'application_sent' || loan.status === 'application_completed' || loan.docusign_status === 'sent' || loan.status === 'ipay_approved' || loan.status === 'dealer_approved' || loan.status === 'fully_signed' || loan.status === 'funded'
                    ? 'is-complete'
                    : ''
                }`}>
                  <div className="loan-progress-label">Application<br/>Sent</div>
                </li>

                {/* Step 2: iPay Signed */}
                <li className={`loan-progress-step ${
                  loan.status === 'ipay_approved' || loan.status === 'dealer_approved' || loan.status === 'fully_signed' || loan.status === 'funded'
                    ? 'is-complete'
                    : loan.docusign_status === 'sent'
                    ? 'is-active'
                    : ''
                }`}>
                  <div className="loan-progress-label">iPay<br/>Signed</div>
                </li>

                {/* Step 3: Organization Signed */}
                <li className={`loan-progress-step ${
                  loan.status === 'dealer_approved' || loan.status === 'fully_signed' || loan.status === 'funded'
                    ? 'is-complete'
                    : loan.status === 'ipay_approved'
                    ? 'is-active'
                    : ''
                }`}>
                  <div className="loan-progress-label">Organization<br/>Signed</div>
                </li>

                {/* Step 4: Borrower Signed */}
                <li className={`loan-progress-step ${
                  loan.status === 'fully_signed' || loan.status === 'funded'
                    ? 'is-complete'
                    : loan.status === 'dealer_approved'
                    ? 'is-active'
                    : ''
                }`}>
                  <div className="loan-progress-label">Borrower<br/>Signed</div>
                </li>

                {/* Step 5: Funded */}
                <li className={`loan-progress-step ${
                  loan.status === 'funded'
                    ? 'is-complete'
                    : loan.status === 'fully_signed'
                    ? 'is-active'
                    : ''
                }`}>
                  <div className="loan-progress-label">Funded</div>
                </li>
              </ol>
              </div>
            </div>

            {/* Payment History */}
            {loan.status === 'funded' && (
              <div className="rounded-2xl shadow-sm border border-gray-200 p-6 ">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Payment History</h3>

                {invoicesLoading ? (
                  <div className="text-center py-4 min-h-[600px] flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Loading payment history...</p>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="min-h-[600px] flex items-start">
                    <p className="text-sm text-gray-600">No payments yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 min-h-[600px] flex flex-col">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                      <p className="text-sm text-blue-900">
                        <strong>{invoices.filter(inv => inv.status === 'paid').length}</strong> of <strong>{loan.term_weeks}</strong> payments completed
                      </p>
                      <div className="mt-2 bg-blue-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-500"
                          style={{ width: `${(invoices.filter(inv => inv.status === 'paid').length / loan.term_weeks) * 100}%` }}
                        />
                      </div>
                    </div>
                      {invoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((invoice) => (
                        <div key={invoice.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors mb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-900">
                                  ${invoice.base_amount?.toFixed(2) || invoice.amount_due.toFixed(2)}
                                </p>
                                {invoice.has_late_fee && (
                                  <p className="text-xs font-medium text-red-600">
                                    + ${invoice.late_fee_amount?.toFixed(2)} late fee
                                  </p>
                                )}
                                {invoice.has_late_fee && (
                                  <p className="text-xs font-semibold text-gray-900">
                                    Total: ${invoice.amount_due.toFixed(2)}
                                  </p>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                              </p>
                              {invoice.is_late_fee_invoice && (
                                <p className="text-xs text-orange-600 font-medium mt-1">
                                  ⚠️ Includes late fee
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              {invoice.status === 'paid' ? (
                                <div>
                                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                    Paid
                                  </span>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : ''}
                                  </p>
                                </div>
                              ) : invoice.status === 'open' ? (
                                <div>
                                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                    Open
                                  </span>
                                  {invoice.hosted_invoice_url && (
                                    <a
                                      href={invoice.hosted_invoice_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block text-xs text-blue-600 hover:text-blue-800 mt-1"
                                    >
                                      View Invoice →
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                  {invoice.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
         

                    {invoices.length > itemsPerPage && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-auto">
                        <p className="text-sm text-gray-600">
                          Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, invoices.length)} of {invoices.length} payments
                        </p>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          <span className="text-sm text-gray-600">
                            Page {currentPage} of {Math.ceil(invoices.length / itemsPerPage)}
                          </span>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(invoices.length / itemsPerPage), prev + 1))}
                            disabled={currentPage === Math.ceil(invoices.length / itemsPerPage)}
                            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {(((loan.status === 'application_completed' || loan.status === 'pending_ipay_signature') && !loan.ipay_signed_at) || (loan.ipay_signed_at && !loan.organization_signed_at) || loan.borrower_signed_at) && (
              <div className="flex gap-3 mb-6">
                {/* Show Send & Sign button for iPay admin when application is completed but not yet signed */}
                {(loan.status === 'application_completed' || loan.status === 'pending_ipay_signature') && !loan.ipay_signed_at && isAdmin && (
                  <button
                    onClick={() => handleSignDocuSign('ipay')}
                    disabled={docusignLoading}
                    className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {docusignLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>{loan.docusign_envelope_id ? 'Opening...' : 'Creating...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{loan.docusign_envelope_id ? 'Sign Document' : 'Create Document'}</span>
                      </>
                    )}
                  </button>
                )}

                {/* Show signing button only when iPay has signed but organization hasn't */}
                {loan.ipay_signed_at && !loan.organization_signed_at && (
                  <button
                    onClick={() => handleSignDocuSign('organization')}
                    disabled={docusignLoading}
                    className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {docusignLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Opening...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Sign Agreement Now</span>
                      </>
                    )}
                  </button>
                )}

                {/* Show fund button only when all parties have signed and loan is not yet funded */}
                {loan.borrower_signed_at && loan.status !== 'funded' && (
                  <button
                    onClick={handleFundLoan}
                    disabled={fundingLoading}
                    className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {fundingLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        <span>Fund Loan</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Main Content - 2 Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - 2/3 width */}
              <div className="lg:col-span-2 space-y-6">
                {/* Loan Information */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Loan Details</h2>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Principal Amount</span>
                      <span className="text-lg font-semibold text-gray-900">${parseFloat(loan.principal_amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Interest Rate</span>
                      <span className="text-lg font-semibold text-gray-900">{(parseFloat(loan.interest_rate) * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Term</span>
                      <span className="text-lg font-semibold text-gray-900">{loan.term_weeks} weeks</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">Weekly Payment</span>
                      <span className="text-lg font-semibold text-green-600">${parseFloat(loan.weekly_payment).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Vehicle Details</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">Vehicle</span>
                      <span className="text-sm font-medium text-gray-900">{loan.vehicle_year} {loan.vehicle_make} {loan.vehicle_model}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">VIN</span>
                      <span className="text-sm font-mono text-gray-900">{loan.vehicle_vin}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column - 1/3 width */}
              <div className="space-y-6">
                {/* Borrower Details */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Borrower Details</h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
                      <p className="text-sm text-gray-900 mt-1">{loan.borrower.email}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Phone</label>
                      <p className="text-sm text-gray-900 mt-1">{loan.borrower.phone}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Date of Birth</label>
                      <p className="text-sm text-gray-900 mt-1">{loan.borrower.date_of_birth ? new Date(loan.borrower.date_of_birth).toLocaleDateString() : 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Address</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {loan.borrower.address_line1}<br />
                        {loan.borrower.city}, {loan.borrower.state} {loan.borrower.zip_code}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Employment</label>
                      <p className="text-sm text-gray-900 mt-1">{loan.borrower.employment_status}</p>
                      {loan.borrower.current_employer_name && (
                        <p className="text-xs text-gray-600 mt-1">{loan.borrower.current_employer_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Annual Income</label>
                      <p className="text-sm font-semibold text-gray-900 mt-1">${parseFloat(loan.borrower.annual_income ?? "0").toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* References */}
                {(loan.borrower.reference1_name || loan.borrower.reference2_name || loan.borrower.reference3_name) && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">References</h2>
                    <div className="space-y-4">
                      {loan.borrower.reference1_name && (
                        <div className="pb-3 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900 mb-1">{loan.borrower.reference1_name}</p>
                          <p className="text-xs text-gray-600">{loan.borrower.reference1_phone || 'No phone'}</p>
                          {loan.borrower.reference1_email && (
                            <p className="text-xs text-gray-600">{loan.borrower.reference1_email}</p>
                          )}
                        </div>
                      )}
                      {loan.borrower.reference2_name && (
                        <div className="pb-3 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900 mb-1">{loan.borrower.reference2_name}</p>
                          <p className="text-xs text-gray-600">{loan.borrower.reference2_phone || 'No phone'}</p>
                          {loan.borrower.reference2_email && (
                            <p className="text-xs text-gray-600">{loan.borrower.reference2_email}</p>
                          )}
                        </div>
                      )}
                      {loan.borrower.reference3_name && (
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">{loan.borrower.reference3_name}</p>
                          <p className="text-xs text-gray-600">{loan.borrower.reference3_phone || 'No phone'}</p>
                          {loan.borrower.reference3_email && (
                            <p className="text-xs text-gray-600">{loan.borrower.reference3_email}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
          </div>
    </div>
  );
}