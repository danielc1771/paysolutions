'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { CreditCard, Loader2, X } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethodSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (setupIntentId: string) => void;
  setupIntentClientSecret: string;
  loanDetails: {
    loan_number: string;
    weekly_payment: number;
    total_payments: number;
    borrower_name: string;
  };
}

interface PaymentFormProps {
  setupIntentClientSecret: string;
  onSuccess: (setupIntentId: string) => void;
  onError: (error: string) => void;
  loanDetails: PaymentMethodSetupProps['loanDetails'];
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  setupIntentClientSecret,
  onSuccess,
  onError,
  loanDetails,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setError('Card element not found');
      setProcessing(false);
      return;
    }

    try {
      const { error, setupIntent } = await stripe.confirmCardSetup(
        setupIntentClientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: loanDetails.borrower_name,
            },
          },
        }
      );

      if (error) {
        console.error('Payment method setup error:', error);
        setError(error.message || 'Failed to set up payment method');
        onError(error.message || 'Failed to set up payment method');
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        console.log('✅ Payment method setup successful:', setupIntent.id);
        onSuccess(setupIntent.id);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred');
      onError('An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#374151',
        fontFamily: '"Inter", system-ui, sans-serif',
        '::placeholder': {
          color: '#9CA3AF',
        },
        iconColor: '#6B7280',
      },
      invalid: {
        color: '#EF4444',
        iconColor: '#EF4444',
      },
    },
    hidePostalCode: false,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Loan Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Loan Summary</h4>
        <div className="text-sm text-blue-700 space-y-1">
          <p><span className="font-medium">Loan:</span> {loanDetails.loan_number}</p>
          <p><span className="font-medium">Borrower:</span> {loanDetails.borrower_name}</p>
          <p><span className="font-medium">Weekly Payment:</span> ${loanDetails.weekly_payment.toLocaleString()}</p>
          <p><span className="font-medium">Total Payments:</span> {loanDetails.total_payments} weeks</p>
          <p><span className="font-medium">Total Amount:</span> ${(loanDetails.weekly_payment * loanDetails.total_payments).toLocaleString()}</p>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start space-x-2">
          <CreditCard className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900 mb-1">Payment Setup</p>
            <p className="text-amber-700">
              Your first payment of <span className="font-semibold">${loanDetails.weekly_payment.toLocaleString()}</span> will be charged immediately upon confirmation.
            </p>
            <p className="text-amber-700 mt-1">
              Subsequent payments will be automatically charged weekly.
            </p>
          </div>
        </div>
      </div>

      {/* Card Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Credit or Debit Card
        </label>
        <div className="border border-gray-300 rounded-xl p-4 bg-white focus-within:ring-2 focus-within:ring-green-500 focus-within:border-transparent">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Setting up payment...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            <span>Confirm Payment Method & Fund Loan</span>
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Your payment information is secure and encrypted. By confirming, you authorize automatic weekly payments.
      </p>
    </form>
  );
};

const PaymentMethodSetup: React.FC<PaymentMethodSetupProps> = ({
  isOpen,
  onClose,
  onSuccess,
  setupIntentClientSecret,
  loanDetails,
}) => {
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleSuccess = (setupIntentId: string) => {
    setError(null);
    onSuccess(setupIntentId);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-md border border-white/20 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Setup Payment Method</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <Elements stripe={stripePromise}>
            <PaymentForm
              setupIntentClientSecret={setupIntentClientSecret}
              onSuccess={handleSuccess}
              onError={handleError}
              loanDetails={loanDetails}
            />
          </Elements>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSetup;