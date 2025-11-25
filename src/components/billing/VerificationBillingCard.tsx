'use client';

import { useState, useEffect, useCallback } from 'react';

interface BillingData {
  status: string;
  hasSubscription: boolean;
  priceId: string | null;
}

interface UsageData {
  currentPeriod: number;
  total: number;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
}

export default function VerificationBillingCard() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBillingData = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/verification');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch billing data');
      }

      setBilling(data.billing);
      setUsage(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const handleActivateBilling = async () => {
    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/billing/verification', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate billing');
      }

      setMessage({ type: 'success', text: 'Verification billing activated successfully!' });
      fetchBillingData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to activate billing' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBilling = async () => {
    if (!confirm('Are you sure you want to cancel verification billing? You will still be charged for usage in the current period.')) {
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/billing/verification', {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel billing');
      }

      setMessage({ type: 'success', text: 'Verification billing canceled.' });
      fetchBillingData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to cancel billing' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Verification Billing</h2>
        </div>
        <div className="p-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-200 border-t-green-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Verification Billing</h2>
        </div>
        <div className="p-6">
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Verification Billing</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage your usage-based verification billing
            </p>
          </div>
          {billing && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(billing.status)}`}>
              {billing.status}
            </span>
          )}
        </div>
      </div>

      <div className="p-6">
        {message && (
          <div className={`p-4 mb-6 rounded-lg ${
            message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Current Period Usage</div>
            <div className="text-2xl font-bold text-gray-900">
              {usage?.currentPeriod || 0}
              <span className="text-sm font-normal text-gray-500 ml-1">verifications</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Total Usage</div>
            <div className="text-2xl font-bold text-gray-900">
              {usage?.total || 0}
              <span className="text-sm font-normal text-gray-500 ml-1">verifications</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Billing Period</div>
            <div className="text-sm font-medium text-gray-900">
              {usage?.billingPeriodStart && usage?.billingPeriodEnd ? (
                <>
                  {formatDate(usage.billingPeriodStart)} - {formatDate(usage.billingPeriodEnd)}
                </>
              ) : (
                'No active period'
              )}
            </div>
          </div>
        </div>

        {/* Pricing Info */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="font-medium text-gray-900">Pay As You Go</div>
              <div className="text-sm text-gray-600">
                You are only charged for the verifications you use. Billed monthly.
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {billing?.status === 'inactive' || billing?.status === 'canceled' ? (
            <button
              onClick={handleActivateBilling}
              disabled={actionLoading}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {actionLoading ? 'Activating...' : 'Activate Billing'}
            </button>
          ) : billing?.status === 'active' ? (
            <button
              onClick={handleCancelBilling}
              disabled={actionLoading}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {actionLoading ? 'Canceling...' : 'Cancel Billing'}
            </button>
          ) : null}
        </div>

        {/* Note about price configuration */}
        {!billing?.priceId && billing?.status === 'inactive' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm text-yellow-800">
                <strong>Setup Required:</strong> A Stripe metered price needs to be configured before billing can be activated.
                Contact your administrator to set up the STRIPE_VERIFICATION_PRICE_ID environment variable.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
