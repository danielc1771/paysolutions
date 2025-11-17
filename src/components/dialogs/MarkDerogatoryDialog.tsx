'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { DEROGATORY_REASONS } from '@/constants/derogatory';

interface MarkDerogatoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, customReason?: string) => void;
  loanNumber: string;
  borrowerName: string;
  remainingBalance: string;
  remainingPayments: number;
}

export default function MarkDerogatoryDialog({
  isOpen,
  onClose,
  onConfirm,
  loanNumber,
  borrowerName,
  remainingBalance,
  remainingPayments,
}: MarkDerogatoryDialogProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
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
      await onConfirm(selectedReason, selectedReason === 'other' ? customReason : undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason('');
      setCustomReason('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-md border border-white/20 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Mark as Derogatory</h2>
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
              <span className="font-semibold text-gray-900">${parseFloat(remainingBalance).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Remaining Payments:</span>
              <span className="font-semibold text-gray-900">{remainingPayments}</span>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-800 font-medium mb-2">⚠️ Warning: This action will:</p>
            <ul className="text-sm text-red-700 space-y-1 ml-4 list-disc">
              <li>Cancel all future scheduled invoices</li>
              <li>Void all open unpaid invoices</li>
              <li>Create a single final invoice for the full remaining balance</li>
              <li>Mark this loan as derogatory (cannot be undone)</li>
              <li>Send notification to the borrower</li>
            </ul>
          </div>

          {/* Reason Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900">
              Reason for Derogatory Status <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white text-gray-900"
            >
              <option value="" className="text-gray-500">Select a reason...</option>
              {DEROGATORY_REASONS.map((reason) => (
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
                  placeholder="Enter the reason for marking this loan as derogatory..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 text-right">
                  {customReason.length}/500 characters
                </p>
              </div>
            )}
          </div>

          {/* Confirmation Text */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Once marked as derogatory, this loan cannot be restored to active status. 
              The borrower will be required to pay the full remaining balance.
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
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                Processing...
              </>
            ) : (
              'Mark as Derogatory'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
