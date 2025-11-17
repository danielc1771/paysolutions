'use client';

import { AlertTriangle, CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react';

interface LoanStatusBadgeProps {
  status: string;
  derogatoryStatus?: boolean;
  derogatoryReason?: string;
  isLate?: boolean;
  daysOverdue?: number;
  className?: string;
}

export default function LoanStatusBadge({
  status,
  derogatoryStatus,
  derogatoryReason,
  isLate,
  daysOverdue,
  className = '',
}: LoanStatusBadgeProps) {
  
  // If loan is late (but not derogatory), show late badge
  if (isLate && !derogatoryStatus && status !== 'derogatory') {
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 ${className}`}>
        <Clock className="w-3 h-3 mr-1" />
        Late {daysOverdue ? `(${daysOverdue}d)` : ''}
      </span>
    );
  }

  // If loan is derogatory, show derogatory badge
  if (derogatoryStatus || status === 'derogatory') {
    return (
      <div className={`inline-flex items-center space-x-1 ${className}`}>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Derogatory
        </span>
        {derogatoryReason && (
          <span className="text-xs text-gray-500 italic">
            ({derogatoryReason})
          </span>
        )}
      </div>
    );
  }

  // If loan is settled
  if (status === 'settled') {
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 ${className}`}>
        <DollarSign className="w-3 h-3 mr-1" />
        Settled
      </span>
    );
  }

  // If loan is closed
  if (status === 'closed') {
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200 ${className}`}>
        <XCircle className="w-3 h-3 mr-1" />
        Closed
      </span>
    );
  }

  // If loan is pending derogatory review
  if (status === 'pending_derogatory_review') {
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 animate-pulse ${className}`}>
        <Clock className="w-3 h-3 mr-1" />
        Pending Review
      </span>
    );
  }

  // Active/Funded loans
  if (status === 'active' || status === 'funded') {
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200 ${className}`}>
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </span>
    );
  }

  // Default status display
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 ${className}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );
}

/**
 * Derogatory Info Card - Shows detailed derogatory information
 */
interface DerogatoryInfoCardProps {
  derogatoryReason: string;
  derogatoryDate: string;
  derogatoryType?: 'manual' | 'automatic';
  remainingBalance?: string;
}

export function DerogatoryInfoCard({
  derogatoryReason,
  derogatoryDate,
  derogatoryType,
  remainingBalance,
}: DerogatoryInfoCardProps) {
  const formattedDate = new Date(derogatoryDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-red-900 mb-1">Derogatory Account</h4>
          <p className="text-sm text-red-800">
            This loan has been marked as derogatory and requires immediate attention.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-red-200">
        <div>
          <p className="text-xs text-red-600 font-medium mb-1">Reason</p>
          <p className="text-sm text-red-900 font-semibold">{derogatoryReason}</p>
        </div>
        <div>
          <p className="text-xs text-red-600 font-medium mb-1">Date Marked</p>
          <p className="text-sm text-red-900 font-semibold">{formattedDate}</p>
        </div>
        {derogatoryType && (
          <div>
            <p className="text-xs text-red-600 font-medium mb-1">Type</p>
            <p className="text-sm text-red-900 font-semibold capitalize">{derogatoryType}</p>
          </div>
        )}
        {remainingBalance && (
          <div>
            <p className="text-xs text-red-600 font-medium mb-1">Balance Due</p>
            <p className="text-sm text-red-900 font-semibold">
              ${parseFloat(remainingBalance).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      <div className="bg-red-100 rounded-xl p-3 flex items-start space-x-2">
        <AlertTriangle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-red-800">
          <strong>Action Required:</strong> Borrower must pay the full remaining balance. 
          All future payments have been cancelled and a final invoice has been created.
        </p>
      </div>
    </div>
  );
}
