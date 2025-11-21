import React from 'react';
import { CheckCircle, Clock, Mail, Shield, Phone, XCircle, AlertCircle } from 'lucide-react';
import type { VerificationStatus, StripeVerificationStatus, PhoneVerificationStatus } from '@/types/verification';

interface VerificationStatusBadgeProps {
  status: VerificationStatus;
  stripeStatus?: StripeVerificationStatus;
  phoneStatus?: PhoneVerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export default function VerificationStatusBadge({
  status,
  stripeStatus,
  phoneStatus,
  size = 'md',
  showIcon = true,
}: VerificationStatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending',
          color: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: <Clock className={iconSizes[size]} />,
        };
      case 'email_sent':
        return {
          label: 'Email Sent',
          color: 'bg-blue-100 text-blue-700 border-blue-300',
          icon: <Mail className={iconSizes[size]} />,
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          icon: <Shield className={iconSizes[size]} />,
        };
      case 'identity_verified':
        return {
          label: 'Identity Verified',
          color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
          icon: <Shield className={iconSizes[size]} />,
        };
      case 'phone_verified':
        return {
          label: 'Phone Verified',
          color: 'bg-teal-100 text-teal-700 border-teal-300',
          icon: <Phone className={iconSizes[size]} />,
        };
      case 'completed':
        return {
          label: 'Completed',
          color: 'bg-green-100 text-green-700 border-green-300',
          icon: <CheckCircle className={iconSizes[size]} />,
        };
      case 'failed':
        return {
          label: 'Failed',
          color: 'bg-red-100 text-red-700 border-red-300',
          icon: <XCircle className={iconSizes[size]} />,
        };
      case 'expired':
        return {
          label: 'Expired',
          color: 'bg-gray-100 text-gray-600 border-gray-300',
          icon: <AlertCircle className={iconSizes[size]} />,
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: <Clock className={iconSizes[size]} />,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="inline-flex flex-col gap-1">
      <span
        className={`inline-flex items-center ${sizeClasses[size]} font-medium rounded-full border ${config.color}`}
      >
        {showIcon && <span className="mr-1.5">{config.icon}</span>}
        {config.label}
      </span>

      {/* Show additional status details if provided */}
      {(stripeStatus || phoneStatus) && (
        <div className="flex gap-1">
          {stripeStatus && stripeStatus !== 'pending' && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {stripeStatus === 'verified' || stripeStatus === 'completed' ? (
                <span className="text-green-600">✓ Identity</span>
              ) : (
                <span className="text-gray-600">{stripeStatus}</span>
              )}
            </span>
          )}
          {phoneStatus && phoneStatus !== 'pending' && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Phone className="w-3 h-3" />
              {phoneStatus === 'verified' ? (
                <span className="text-green-600">✓ Phone</span>
              ) : (
                <span className="text-gray-600">{phoneStatus}</span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
