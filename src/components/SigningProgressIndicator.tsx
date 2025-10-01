'use client';

import { Check, Clock, User, Building, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface SigningProgressProps {
  ipayStatus?: 'pending' | 'completed';
  organizationStatus?: 'pending' | 'completed';
  borrowerStatus?: 'pending' | 'completed';
  currentStage?: 'ipay' | 'organization' | 'borrower' | 'complete';
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SigningProgressIndicator({
  ipayStatus = 'pending',
  organizationStatus = 'pending',
  borrowerStatus = 'pending',
  currentStage,
  showLabels = false,
  size = 'md',
}: SigningProgressProps) {
  // Determine current stage based on statuses if not explicitly provided
  const activeStage = currentStage || (
    borrowerStatus === 'completed' ? 'complete' :
    organizationStatus === 'completed' ? 'borrower' :
    ipayStatus === 'completed' ? 'organization' :
    'ipay'
  );

  const sizeClasses = {
    sm: { circle: 'w-6 h-6 text-xs', line: 'h-0.5', gap: 'space-x-2' },
    md: { circle: 'w-8 h-8 text-sm', line: 'h-1', gap: 'space-x-3' },
    lg: { circle: 'w-10 h-10 text-base', line: 'h-1', gap: 'space-x-4' },
  };

  const stages = [
    {
      id: 'ipay',
      label: 'iPay Admin',
      icon: <User className="w-4 h-4" />,
      status: ipayStatus,
      isActive: activeStage === 'ipay',
    },
    {
      id: 'organization',
      label: 'Organization',
      icon: <Building className="w-4 h-4" />,
      status: organizationStatus,
      isActive: activeStage === 'organization',
    },
    {
      id: 'borrower',
      label: 'Borrower',
      icon: <UserCheck className="w-4 h-4" />,
      status: borrowerStatus,
      isActive: activeStage === 'borrower',
    },
  ];

  const getStageColors = (status: string, isActive: boolean) => {
    if (status === 'completed') {
      return 'bg-green-500 text-white border-green-500';
    }
    if (isActive) {
      return 'bg-blue-500 text-white border-blue-500 animate-pulse';
    }
    return 'bg-gray-200 text-gray-500 border-gray-300';
  };

  const getLineColor = (prevStatus: string) => {
    return prevStatus === 'completed' ? 'bg-green-500' : 'bg-gray-200';
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`flex items-center ${sizeClasses[size].gap}`}>
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  ${sizeClasses[size].circle}
                  rounded-full flex items-center justify-center
                  border-2 transition-all duration-300
                  ${getStageColors(stage.status, stage.isActive)}
                `}
              >
                {stage.status === 'completed' ? (
                  <Check className="w-3 h-3" />
                ) : stage.isActive ? (
                  <Clock className="w-3 h-3" />
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </motion.div>
              {showLabels && (
                <span className={`mt-1 text-xs ${
                  stage.status === 'completed' ? 'text-green-600' :
                  stage.isActive ? 'text-blue-600' :
                  'text-gray-500'
                }`}>
                  {stage.label}
                </span>
              )}
            </div>
            {index < stages.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: index * 0.1 + 0.05 }}
                className={`
                  w-8 md:w-12 ${sizeClasses[size].line}
                  ${getLineColor(stage.status)}
                  origin-left
                `}
              />
            )}
          </div>
        ))}
      </div>
      {activeStage === 'complete' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-green-600 text-sm font-semibold"
        >
          ✓ Fully Signed
        </motion.div>
      )}
    </div>
  );
}

// Simplified inline progress dots for loan cards
export function SigningProgressDots({
  ipayComplete,
  organizationComplete,
  borrowerComplete,
}: {
  ipayComplete: boolean;
  organizationComplete: boolean;
  borrowerComplete: boolean;
}) {
  return (
    <div className="flex items-center space-x-1">
      <div
        className={`w-2 h-2 rounded-full ${
          ipayComplete ? 'bg-green-500' : 'bg-gray-300'
        }`}
        title="iPay Admin"
      />
      <div
        className={`w-2 h-2 rounded-full ${
          organizationComplete ? 'bg-green-500' : 'bg-gray-300'
        }`}
        title="Organization Owner"
      />
      <div
        className={`w-2 h-2 rounded-full ${
          borrowerComplete ? 'bg-green-500' : 'bg-gray-300'
        }`}
        title="Borrower"
      />
    </div>
  );
}

// Helper function to get progress text
export function getSigningProgressText(status: string): string {
  switch (status) {
    case 'application_completed':
      return 'Awaiting iPay signature';
    case 'ipay_approved':
      return 'Awaiting organization signature';
    case 'dealer_approved':
      return 'Awaiting borrower signature';
    case 'fully_signed':
      return 'Fully signed';
    default:
      return status;
  }
}