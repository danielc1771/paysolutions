'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CreditCard, ArrowLeft, CheckCircle, Lock, Shield } from 'lucide-react';
import Link from 'next/link';

// Debug Stripe key and initialization
console.log(' Stripe Environment Check:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY exists:', !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
console.log('- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY length:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.length);
console.log('- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY starts with pk_:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_'));

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Validate Stripe key format
if (!stripePublishableKey) {
  console.error(' NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined');
} else if (!stripePublishableKey.startsWith('pk_')) {
  console.error(' Invalid Stripe publishable key format. Key should start with "pk_"');
  console.error(' Current key:', stripePublishableKey.substring(0, 10) + '...');
} else {
  console.log(' Stripe publishable key format is valid');
}

// Initialize Stripe with error handling
let stripePromise: Promise<any> | null = null;

try {
  if (stripePublishableKey && stripePublishableKey.startsWith('pk_')) {
    console.log(' Initializing Stripe with key:', stripePublishableKey.substring(0, 10) + '...');
    stripePromise = loadStripe(stripePublishableKey);
    
    // Test the promise to catch initialization errors early
    stripePromise
      .then((stripe) => {
        if (stripe) {
          console.log(' Stripe initialized successfully');
        } else {
          console.error(' Stripe initialization returned null');
        }
      })
      .catch((error) => {
        console.error(' Stripe initialization failed:', error);
      });
  } else {
    console.error(' Cannot initialize Stripe: Invalid or missing publishable key');
  }
} catch (error) {
  console.error(' Error during Stripe initialization:', error);
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      padding: '12px',
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

function PaymentSetupForm() {
  const searchParams = useSearchParams();
  const setupIntent = searchParams?.get('setup_intent') || '';
  
  const stripe = useStripe();
  const elements = useElements();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [billingAddress, setBillingAddress] = useState({
    line1: '',
    city: '',
    state: '',
    postal_code: '',
  });

  // Debug logging for component state
  useEffect(() => {
    console.log(' PaymentSetupForm mounted');
    console.log('- setupIntent:', setupIntent ? setupIntent.substring(0, 20) + '...' : 'null');
    console.log('- stripe instance:', !!stripe);
    console.log('- elements instance:', !!elements);
  }, [setupIntent, stripe, elements]);

  // Validate setup intent on mount
  useEffect(() => {
    if (!setupIntent || typeof setupIntent !== 'string' || setupIntent.trim() === '') {
      console.error(' Invalid setup intent:', setupIntent);
      setError('Invalid payment setup link. Please try again from the loan page.');
    } else {
      console.log(' Setup intent is valid');
    }
  }, [setupIntent]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log(' Starting payment setup submission');

    if (!stripe || !elements) {
      console.error(' Stripe or Elements not loaded:', { stripe: !!stripe, elements: !!elements });
      setError('Payment system not loaded. Please refresh and try again.');
      return;
    }

    if (!setupIntent || typeof setupIntent !== 'string' || setupIntent.trim() === '') {
      console.error(' Invalid setup intent during submission:', setupIntent);
      setError('Payment setup not properly initialized. Please refresh and try again.');
      return;
    }

    if (!cardholderName.trim()) {
      console.error(' Missing cardholder name');
      setError('Please enter the cardholder name.');
      return;
    }

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      console.error(' Card number element not found');
      setError('Card element not found. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log(' Confirming card setup with setup intent:', setupIntent.substring(0, 20) + '...');
      console.log(' Cardholder name:', cardholderName);
      console.log(' Billing address:', billingAddress);

      const { error: stripeError, setupIntent: confirmedSetupIntent } = await stripe.confirmCardSetup(
        setupIntent,
        {
          payment_method: {
            card: cardNumberElement,
            billing_details: {
              name: cardholderName,
              address: {
                line1: billingAddress.line1 || undefined,
                city: billingAddress.city || undefined,
                state: billingAddress.state || undefined,
                postal_code: billingAddress.postal_code || undefined,
                country: 'US',
              },
            },
          },
        }
      );

      if (stripeError) {
        console.error(' Stripe error during confirmCardSetup:', stripeError);
        setError(stripeError.message || 'Payment setup failed. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (confirmedSetupIntent && confirmedSetupIntent.status === 'succeeded') {
        console.log(' Setup intent succeeded:', confirmedSetupIntent.id);
        setSetupComplete(true);
        
        // Call backend to complete the setup
        try {
          console.log(' Calling backend to complete setup');
          const response = await fetch('/api/payment-setup/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              setupIntentId: confirmedSetupIntent.id,
              paymentMethodId: confirmedSetupIntent.payment_method,
            }),
          });

          if (!response.ok) {
            console.warn(' Backend update failed but payment setup succeeded');
            console.warn(' Response status:', response.status);
            const errorText = await response.text();
            console.warn(' Response text:', errorText);
          } else {
            const result = await response.json();
            console.log(' Backend updated successfully:', result);
          }
        } catch (backendError) {
          console.warn(' Backend update failed:', backendError);
          // Don't show error to user since payment setup succeeded
        }
      } else {
        console.error(' Setup intent did not succeed:', confirmedSetupIntent?.status);
        setError('Payment setup was not completed. Please try again.');
      }
    } catch (err) {
      console.error(' Payment setup error:', err);
      setError('Payment setup failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Show error if Stripe key is invalid
  if (!stripePublishableKey || !stripePublishableKey.startsWith('pk_')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            Payment System Configuration Error
          </h1>
          <p className="text-gray-600 mb-6">
            The payment system is not properly configured. Please contact support.
          </p>
          <Link
            href="/admin/loans"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Loans
          </Link>
        </div>
      </div>
    );
  }

  if (!setupIntent || typeof setupIntent !== 'string' || setupIntent.trim() === '') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            Invalid Payment Setup
          </h1>
          <p className="text-gray-600 mb-6">
            The payment setup link is invalid or has expired. Please return to your loan page and try again.
          </p>
          <Link
            href="/admin/loans"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Loans
          </Link>
        </div>
      </div>
    );
  }

  if (setupComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Setup Complete!
          </h1>
          <p className="text-gray-600 mb-8">
            Your payment method has been successfully saved. Recurring payments will be automatically charged according to your loan schedule.
          </p>
          <Link
            href="/admin/loans"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Loans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Set Up Automatic Payments
          </h1>
          <p className="text-gray-600">
            Securely save your payment method for automatic loan payments
          </p>
        </div>

        {/* Security Badge */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Secure Payment Processing
              </p>
              <p className="text-xs text-green-600">
                Your payment information is encrypted and secure
              </p>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cardholder Name */}
            <div>
              <label htmlFor="cardholderName" className="block text-sm font-medium text-gray-700 mb-2">
                Cardholder Name
              </label>
              <input
                type="text"
                id="cardholderName"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                placeholder="Enter full name as it appears on card"
                required
              />
            </div>

            {/* Card Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Number
              </label>
              <div className="border border-gray-300 rounded-lg p-4 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                <CardNumberElement options={CARD_ELEMENT_OPTIONS} />
              </div>
            </div>

            {/* Card Details Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiry Date
                </label>
                <div className="border border-gray-300 rounded-lg p-4 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVC
                </label>
                <div className="border border-gray-300 rounded-lg p-4 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
                </div>
              </div>
            </div>

            {/* Billing Address */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Billing Address (Optional)</h3>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  id="address"
                  value={billingAddress.line1}
                  onChange={(e) => setBillingAddress(prev => ({ ...prev, line1: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={billingAddress.city}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    placeholder="New York"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    value={billingAddress.state}
                    onChange={(e) => setBillingAddress(prev => ({ ...prev, state: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    placeholder="NY"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  id="zip"
                  value={billingAddress.postal_code}
                  onChange={(e) => setBillingAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="10001"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!stripe || isProcessing}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold text-lg"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Save Payment Method
                </>
              )}
            </button>

            {/* Security Notice */}
            <p className="text-xs text-gray-500 text-center">
              Your payment information is encrypted and secure. We use industry-standard security measures to protect your data.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function PaymentSetupPage() {
  console.log(' PaymentSetupPage rendering');
  
  // Check if Stripe promise is available
  if (!stripePromise) {
    console.error(' Stripe promise is null, cannot render Elements');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CreditCard className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">
            Payment System Error
          </h1>
          <p className="text-gray-600 mb-6">
            Unable to initialize payment system. Please check your configuration and try again.
          </p>
          <Link
            href="/admin/loans"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Loans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading payment setup...</p>
        </div>
      </div>
    }>
      <Elements stripe={stripePromise}>
        <PaymentSetupForm />
      </Elements>
    </Suspense>
  );
}

export default PaymentSetupPage;
