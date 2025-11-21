import React from 'react';
import { CheckCircle, Circle, Clock, Mail, Shield, Phone } from 'lucide-react';
import type { Verification, VerificationWithCreator } from '@/types/verification';

interface VerificationTimelineProps {
  verification: Verification | VerificationWithCreator;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface TimelineStep {
  label: string;
  status: 'completed' | 'in-progress' | 'pending' | 'skipped';
  timestamp?: string;
  icon: React.ReactNode;
  description?: string;
}

export default function VerificationTimeline({
  verification,
  showLabels = true,
  size = 'md',
}: VerificationTimelineProps) {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const dotSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  // Determine if phone verification is required (based on whether phone field exists)
  const requiresPhone = !!verification.phone;

  // Build timeline steps
  const steps: TimelineStep[] = [
    {
      label: 'Created',
      status: 'completed',
      timestamp: verification.created_at,
      icon: <Circle className={iconSizes[size]} />,
      description: 'Verification request created',
    },
    {
      label: 'Email Sent',
      status: verification.email_sent_at ? 'completed' : verification.status === 'pending' ? 'pending' : 'in-progress',
      timestamp: verification.email_sent_at || undefined,
      icon: <Mail className={iconSizes[size]} />,
      description: verification.email_sent_at ? 'Email sent to customer' : 'Waiting to send email',
    },
    {
      label: 'Identity Verified',
      status: verification.stripe_verified_at
        ? 'completed'
        : verification.stripe_verification_status === 'processing' || verification.stripe_verification_status === 'requires_action'
        ? 'in-progress'
        : 'pending',
      timestamp: verification.stripe_verified_at || undefined,
      icon: <Shield className={iconSizes[size]} />,
      description: verification.stripe_verified_at
        ? 'Identity documents verified'
        : verification.stripe_verification_status === 'processing'
        ? 'Verification in progress'
        : 'Awaiting identity verification',
    },
  ];

  // Add phone verification step if required
  if (requiresPhone) {
    steps.push({
      label: 'Phone Verified',
      status: verification.phone_verified_at
        ? 'completed'
        : verification.phone_verification_status === 'sent'
        ? 'in-progress'
        : verification.stripe_verified_at
        ? 'pending'
        : 'pending',
      timestamp: verification.phone_verified_at || undefined,
      icon: <Phone className={iconSizes[size]} />,
      description: verification.phone_verified_at
        ? 'Phone number verified'
        : verification.phone_verification_status === 'sent'
        ? 'Verification code sent'
        : 'Awaiting phone verification',
    });
  }

  // Final completed step
  steps.push({
    label: 'Completed',
    status: verification.completed_at ? 'completed' : 'pending',
    timestamp: verification.completed_at || undefined,
    icon: <CheckCircle className={iconSizes[size]} />,
    description: verification.completed_at ? 'Verification complete' : 'Awaiting completion',
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-200" style={{ left: size === 'sm' ? '16px' : size === 'lg' ? '24px' : '20px' }} />

      {/* Steps */}
      <div className="space-y-6">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isInProgress = step.status === 'in-progress';

          return (
            <div key={index} className="relative flex items-start gap-4">
              {/* Icon dot */}
              <div
                className={`relative z-10 flex items-center justify-center rounded-full border-2 flex-shrink-0 ${dotSizes[size]} ${
                  isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : isInProgress
                    ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className={iconSizes[size]} />
                ) : isInProgress ? (
                  <Clock className={`${iconSizes[size]} animate-spin`} />
                ) : (
                  step.icon
                )}
              </div>

              {/* Content */}
              {showLabels && (
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-semibold ${
                        isCompleted ? 'text-gray-900' : isInProgress ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </h4>
                    {step.timestamp && (
                      <span className="text-xs text-gray-500">{formatTimestamp(step.timestamp)}</span>
                    )}
                  </div>
                  {step.description && (
                    <p className={`text-sm mt-1 ${isCompleted || isInProgress ? 'text-gray-600' : 'text-gray-400'}`}>
                      {step.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
