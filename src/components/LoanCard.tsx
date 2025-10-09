import React from 'react';
import Link from 'next/link';
import { FileText, Calendar, Car, CheckCircle, PenTool, Trash2, Eye } from 'lucide-react';
import { LoanListItem, AdminLoanListItem } from '@/types/loan';
import { SigningProgressDots, getSigningProgressText } from '@/components/SigningProgressIndicator';
import { formatLoanStatus } from '@/utils/formatters';

interface LoanCardProps {
  loan: LoanListItem | AdminLoanListItem;
  isAdmin?: boolean;
  onSignDocuSign?: (loanId: string, e: React.MouseEvent) => void;
  signingLoans?: Set<string>;
  onDelete?: (loanId: string, loanNumber: string, borrowerName: string) => void;
  showActions?: boolean;
}

export function LoanCard({ loan, isAdmin = false, onSignDocuSign, signingLoans, onDelete, showActions = true }: LoanCardProps) {
  const needsAction = loan.status === 'application_completed' || 
                      loan.status === 'ipay_approved' || 
                      loan.status === 'fully_signed';
  const needsOrgSigning = loan.status === 'ipay_approved';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'application_sent': return 'bg-yellow-100 text-yellow-800';
      case 'application_completed': return 'bg-orange-100 text-orange-800';
      case 'ipay_approved': return 'bg-purple-100 text-purple-800';
      case 'dealer_approved': return 'bg-indigo-100 text-indigo-800';
      case 'fully_signed': return 'bg-emerald-100 text-emerald-800';
      case 'review': return 'bg-orange-100 text-orange-800';
      case 'funded': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Link
      href={`/dashboard/loans/${loan.id}`}
      className={`group relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-white/30 block ${needsAction ? 'ring-2 ring-orange-400 bg-orange-50/70' : ''}`}
    >
      {needsAction && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex-shrink-0">
            <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">
                {loan.borrower?.first_name?.[0]}{loan.borrower?.last_name?.[0]}
              </span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-bold text-gray-900 truncate">
                {loan.borrower?.first_name} {loan.borrower?.last_name}
              </h3>
              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                {formatLoanStatus(loan.status)}
              </span>
              {/* Show signing progress for loans in signing stages */}
              {(loan.status === 'application_completed' ||
                loan.status === 'ipay_approved' ||
                loan.status === 'dealer_approved' ||
                loan.status === 'fully_signed') && (
                <div className="flex items-center space-x-2">
                  <SigningProgressDots
                    ipayComplete={loan.status === 'ipay_approved' || loan.status === 'dealer_approved' || loan.status === 'fully_signed'}
                    organizationComplete={loan.status === 'dealer_approved' || loan.status === 'fully_signed'}
                    borrowerComplete={loan.status === 'fully_signed'}
                  />
                  <span className="text-xs text-gray-600">
                    {getSigningProgressText(loan.status)}
                  </span>
                </div>
              )}
              {needsAction && (
                <span className="inline-flex items-center px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-300">
                  🚨 Action Required
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center">
                <FileText className="w-4 h-4 mr-1 text-green-500" />
                {loan.loan_number}
              </span>
              {isAdmin && 'organization' in loan && loan.organization?.name && (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {loan.organization.name}
                </span>
              )}
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-purple-500" />
                {formatDate(loan.created_at)}
              </span>
              {loan.vehicle_make && (
                <span className="flex items-center">
                  <Car className="w-4 h-4 mr-1 text-gray-500" />
                  {loan.vehicle_year} {loan.vehicle_make} {loan.vehicle_model}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-8">
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              ${parseFloat(loan.principal_amount).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 font-medium">Principal Amount</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {needsAction && onSignDocuSign && (
              <>
                {loan.status === 'application_completed' && (
                  <button 
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-green-200 hover:scale-105"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.href = `/dashboard/loans/${loan.id}?action=review`;
                    }}
                    title="Review Application"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Review
                  </button>
                )}
                {needsOrgSigning && (
                  <button 
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-purple-200 hover:scale-105"
                    onClick={(e) => onSignDocuSign(loan.id, e)}
                    disabled={signingLoans?.has(loan.id)}
                    title="Sign DocuSign Agreement"
                  >
                    {signingLoans?.has(loan.id) ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border border-purple-700 border-t-transparent mr-1"></div>
                        Signing...
                      </div>
                    ) : (
                      <>
                        <PenTool className="w-4 h-4 inline mr-1" />
                        Sign DocuSign
                      </>
                    )}
                  </button>
                )}
                {loan.status === 'fully_signed' && (
                  <button 
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-blue-200 hover:scale-105"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.location.href = `/dashboard/loans/${loan.id}?action=fund`;
                    }}
                    title="Fund Loan"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    Fund
                  </button>
                )}
              </>
            )}
            
            {showActions && (
              <>
                <button 
                  className="p-3 bg-blue-100 text-blue-600 rounded-2xl transition-all duration-300 group-hover:scale-110 hover:bg-blue-200"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = `/dashboard/loans/${loan.id}`;
                  }}
                  title="View Details"
                >
                  <Eye className="w-5 h-5" />
                </button>
                
                {onDelete && (
                  <button 
                    className="p-3 bg-red-100 text-red-600 rounded-2xl transition-all duration-300 group-hover:scale-110 hover:bg-red-200"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(loan.id, loan.loan_number, `${loan.borrower?.first_name} ${loan.borrower?.last_name}`);
                    }}
                    title="Delete Loan"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </>
            )}
            
            {!showActions && (
              <button 
                className={`p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 ${needsAction ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
