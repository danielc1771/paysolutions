'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckCircle, CreditCard, Calendar, DollarSign, User, FileText, Shield, Lock } from 'lucide-react';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface LoanSummary {
  id: string;
  loan_number: string;
  borrower_name: string;
  principal_amount: string;
  interest_rate: string;
  term_weeks: string;
  weekly_payment: string;
  funding_date: string;
  status: string;
  borrower: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface PaymentScheduleItem {
  paymentNumber: number;
  dueDate: string;
  principalPayment: number;
  interestPayment: number;
  totalPayment: number;
  remainingBalance: number;
  status: 'pending' | 'paid' | 'overdue';
}

function PaymentForm({ loan, onPaymentSuccess }: { loan: LoanSummary; onPaymentSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [paymentMode, setPaymentMode] = useState<'setup' | 'onetime'>('setup');
  const [paymentAmount, setPaymentAmount] = useState(parseFloat(loan.monthly_payment));

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
      if (paymentMode === 'setup') {
        // Setup card for auto-billing (create setup intent)
        const response = await fetch('/api/stripe/setup-payment-method', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            loanId: loan.id,
            customerEmail: loan.borrower.email,
            customerName: cardholderName,
          }),
        });

        const { clientSecret, error: apiError } = await response.json();

        if (apiError) {
          throw new Error(apiError);
        }

        // Confirm setup intent
        const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cardholderName,
              email: loan.borrower.email,
            },
          },
        });

        if (stripeError) {
          throw new Error(stripeError.message);
        }

        if (setupIntent?.status === 'succeeded') {
          onPaymentSuccess();
        }
      } else {
        // One-time payment
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Math.round(paymentAmount * 100),
            loanId: loan.id,
            description: `One-time payment for Loan #${loan.loan_number}`,
          }),
        });

        const { clientSecret, error: apiError } = await response.json();

        if (apiError) {
          throw new Error(apiError);
        }

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cardholderName,
              email: loan.borrower.email,
            },
          },
        });

        if (stripeError) {
          throw new Error(stripeError.message);
        }

        if (paymentIntent?.status === 'succeeded') {
          onPaymentSuccess();
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Setup Auto-Billing</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Mode Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Payment Option
          </label>
          <div className="space-y-3">
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                paymentMode === 'setup' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setPaymentMode('setup')}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMode"
                  value="setup"
                  checked={paymentMode === 'setup'}
                  onChange={() => setPaymentMode('setup')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">Setup Auto-Billing (Recommended)</h3>
                  <p className="text-sm text-gray-600">
                    Save your card for automatic monthly payments of ${parseFloat(loan.monthly_payment).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                paymentMode === 'onetime' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setPaymentMode('onetime')}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="paymentMode"
                  value="onetime"
                  checked={paymentMode === 'onetime'}
                  onChange={() => setPaymentMode('onetime')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">Make One-Time Payment</h3>
                  <p className="text-sm text-gray-600">
                    Pay ahead or make an additional payment with a different card
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Amount - Only show for one-time payments */}
        {paymentMode === 'onetime' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Payment Amount
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                placeholder="0.00"
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Monthly payment: ${parseFloat(loan.monthly_payment).toLocaleString()}
            </p>
          </div>
        )}

        {/* Cardholder Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Cardholder Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={cardholderName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCardholderName(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Full name on card"
              required
            />
          </div>
        </div>

        {/* Card Details */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Card Details
          </label>
          <div className="p-4 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!stripe || processing}
          className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {paymentMode === 'setup' ? 'Processing Setup...' : 'Processing Payment...'}
            </>
          ) : (
            <>
              <Lock className="w-5 h-5" />
              {paymentMode === 'setup' 
                ? 'Setup Auto-Billing' 
                : `Pay $${paymentAmount.toLocaleString()}`
              }
            </>
          )}
        </button>
      </form>

      {/* Security Notice */}
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          <p className="text-green-800 text-sm font-medium">
            Your payment is secured with 256-bit SSL encryption
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCollectionPage() {
  const params = useParams();
  const loanId = params?.loanId as string;
  
  const [loan, setLoan] = useState<LoanSummary | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!loanId) return;

      try {
        setLoading(true);
        
        // Fetch loan summary and payment schedule in parallel
        const [loanResponse, scheduleResponse] = await Promise.all([
          fetch(`/api/loans/${loanId}/summary`),
          fetch(`/api/loans/${loanId}/payment-schedule`)
        ]);

        if (!loanResponse.ok) {
          throw new Error('Failed to fetch loan details');
        }

        if (!scheduleResponse.ok) {
          throw new Error('Failed to fetch payment schedule');
        }

        const [loanData, scheduleData] = await Promise.all([
          loanResponse.json(),
          scheduleResponse.json()
        ]);

        setLoan(loanData);
        setPaymentSchedule(scheduleData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loanId]);

  const handlePaymentSuccess = () => {
    setPaymentSuccess(true);
    // Refresh payment schedule to show updated status
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error || 'Loan not found'}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup Successful!</h1>
            <p className="text-gray-600 mb-6">Your auto-billing setup has been processed successfully.</p>
            <p className="text-sm text-gray-500">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  const nextPayment = paymentSchedule.find(p => p.status === 'pending');
  const totalPaid = paymentSchedule.filter(p => p.status === 'paid').length;
  const totalPayments = paymentSchedule.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Collection</h1>
            <p className="text-xl text-gray-600">Loan #{loan.loan_number}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Loan Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Loan Overview */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Loan Overview</h2>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Borrower:</span>
                  <span className="font-semibold text-gray-900">{loan.borrower_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Principal:</span>
                  <span className="font-semibold text-gray-900">${parseFloat(loan.principal_amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Interest Rate:</span>
                  <span className="font-semibold text-gray-900">{parseFloat(loan.interest_rate)}% APR</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Term:</span>
                  <span className="font-semibold text-gray-900">{loan.term_months} months</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600 font-medium">Monthly Payment:</span>
                  <span className="font-semibold text-gray-900">${parseFloat(loan.monthly_payment).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Next Payment Due */}
            {nextPayment && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-orange-800">Next Payment Due</h3>
                </div>
                
                <div className="space-y-2">
                  <p className="text-orange-700">
                    <span className="font-semibold">Due Date:</span> {new Date(nextPayment.dueDate).toLocaleDateString()}
                  </p>
                  <p className="text-orange-700">
                    <span className="font-semibold">Amount:</span> ${nextPayment.totalPayment.toLocaleString()}
                  </p>
                  <p className="text-orange-700">
                    <span className="font-semibold">Payment #{nextPayment.paymentNumber}</span> of {totalPayments}
                  </p>
                </div>
              </div>
            )}

            {/* Payment Progress */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Payment Progress</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Payments Made:</span>
                  <span className="font-semibold text-gray-900">{totalPaid} of {totalPayments}</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(totalPaid / totalPayments) * 100}%` }}
                  ></div>
                </div>
                
                <p className="text-sm text-gray-500 text-center">
                  {Math.round((totalPaid / totalPayments) * 100)}% Complete
                </p>
              </div>
            </div>
          </div>

          {/* Right Content - Payment Form */}
          <div className="lg:col-span-2">
            <Elements stripe={stripePromise}>
              <PaymentForm loan={loan} onPaymentSuccess={handlePaymentSuccess} />
            </Elements>
          </div>
        </div>

        {/* Payment Schedule Table */}
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Schedule</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment #</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Principal</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Interest</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Payment</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
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
                      ${payment.principalPayment.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      ${payment.interestPayment.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      ${payment.totalPayment.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        payment.status === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {paymentSchedule.length > 12 && (
            <p className="text-center text-gray-500 text-sm mt-4">
              Showing first 12 payments of {paymentSchedule.length} total
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
