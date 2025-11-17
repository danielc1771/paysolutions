'use client';

import { useState } from 'react';
import { XCircle, X } from 'lucide-react';
import { CLOSURE_REASONS } from '@/constants/derogatory';

interface CloseLoanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, customReason?: string, waiveBalance?: boolean) => void;
  loanNumber: string;
  borrowerName: string;
  remainingBalance: string;
  remainingPayments: number;
}

export default function CloseLoanDialog({
  isOpen,
  onClose,
  onConfirm,
  loanNumber,
  borrowerName,
  remainingBalance,
  remainingPayments,
}: CloseLoanDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [waiveBalance, setWaiveBalance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!selectedReason) {
      alert('Please select a reason');
      return;
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      alert('Please provide a reason in the text field');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(selectedReason, selectedReason === 'other' ? customReason : undefined, waiveBalance);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setCustomReason('');
      setWaiveBalance(false);
      onClose();
    }
  };

  const balanceAmount = parseFloat(remainingBalance);
  const hasBalance = balanceAmount > 0;

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-md border border-white/20 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <XCircle className="w-5 h-5 text-gray-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Close Loan</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Loan Info */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Loan Number:</span>
              <span className="font-semibold text-gray-900">{loanNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Borrower:</span>
              <span className="font-semibold text-gray-900">{borrowerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Remaining Balance:</span>
              <span className="font-semibold text-gray-900">${balanceAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Remaining Payments:</span>
              <span className="font-semibold text-gray-900">{remainingPayments}</span>
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">ℹ️ This action will:</p>
            <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
              <li>Cancel all future scheduled invoices</li>
              <li>Void all open unpaid invoices</li>
              <li>Mark this loan as closed</li>
              <li>Send notification to the borrower</li>
              {!waiveBalance && hasBalance && (
                <li className="font-semibold">Create a final invoice for remaining balance</li>
              )}
              {waiveBalance && hasBalance && (
                <li className="font-semibold text-green-700">Waive the remaining balance (no final invoice)</li>
              )}
            </ul>
          </div>

          {/* Reason Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">
              Reason for Closure <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-900"
            >
              <option value="" className="text-gray-500">Select a reason...</option>
              {CLOSURE_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value} className="text-gray-900 bg-white">
                  {reason.label}
                </option>
              ))}
            </select>

            {/* Custom Reason Text Field */}
            {selectedReason === 'other' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Please specify the reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter the reason for closing this loan..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 text-right">
                  {customReason.length}/500 characters
                </p>
              </div>
            )}
          </div>

          {/* Waive Balance Option */}
          {hasBalance && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waiveBalance}
                  onChange={(e) => setWaiveBalance(e.target.checked)}
                  disabled={isSubmitting}
                  className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900">
                    Waive Remaining Balance
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Check this to forgive the remaining ${balanceAmount.toLocaleString()} balance. 
                    No final invoice will be created and the borrower will not be charged.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Confirmation Text */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Closing a loan is permanent and cannot be undone. 
              The loan status will be set to &quot;Closed&quot; and all billing will stop immediately.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-6 py-4 rounded-b-3xl flex space-x-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 px-6 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedReason || (selectedReason === 'other' && !customReason.trim())}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Processing...
              </>
            ) : (
              'Close Loan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
