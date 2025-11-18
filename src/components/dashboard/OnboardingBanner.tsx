'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface OnboardingBannerProps {
  onComplete: () => void;
  onDismiss: () => void;
}

export default function OnboardingBanner({ onComplete, onDismiss }: OnboardingBannerProps) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 p-4 mb-6 rounded-lg shadow-sm">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-semibold text-amber-900">
            Complete Your Profile
          </h3>
          <p className="mt-1 text-sm text-amber-700">
            Please complete your contact and business information to unlock all platform features.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={onComplete}
              className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              Complete Now
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2 bg-white text-amber-900 text-sm font-medium rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors"
            >
              Remind Me Later
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="ml-4 text-amber-600 hover:text-amber-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
