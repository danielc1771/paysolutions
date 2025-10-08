'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Loader2, AlertCircle } from 'lucide-react';

/**
 * Inner component that uses useSearchParams
 */
function DocuSignCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your signature...');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Get parameters from URL
        const envelopeId = searchParams.get('envelopeId');
        const event = searchParams.get('event');

        if (!envelopeId) {
          throw new Error('No envelope ID provided');
        }

        // Check if the signing was successful based on event parameter
        if (event === 'signing_complete') {
          // Update the loan's signing timestamps based on which signer completed
          try {
            const updateResponse = await fetch('/api/docusign/update-signing-timestamp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ envelopeId }),
            });

            const updateData = await updateResponse.json();

            if (!updateData.success) {
              console.error('Failed to update signing timestamp:', updateData.error);
            } else {
              console.log('Successfully updated signing timestamp:', updateData.signerType);
            }
          } catch (updateError) {
            console.error('Error updating signing timestamp:', updateError);
          }

          setStatus('success');
          setMessage('Your document has been signed successfully!');

          // Redirect to appropriate dashboard after 3 seconds
          setTimeout(() => {
            // Try to determine user type and redirect appropriately
            // Default to login page if we can't determine the user type
            router.push('/login');
          }, 3000);
        } else if (event === 'cancel' || event === 'decline') {
          setStatus('error');
          setMessage('The document signing was cancelled or declined.');
        } else {
          // Default success case
          setStatus('success');
          setMessage('Your signature has been recorded successfully!');

          setTimeout(() => {
            router.push('/login');
          }, 3000);
        }
      } catch (error) {
        console.error('Error processing DocuSign completion:', error);
        setStatus('error');
        setMessage('Unable to verify signature status. Please contact support if this persists.');
      }
    };

    checkStatus();
  }, [router, searchParams]);

  const handleReturnClick = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/30 p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Processing...</h1>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Signature Complete!</h1>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting you to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Signing Issue</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={handleReturnClick}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg"
              >
                Return to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading fallback component
 */
function DocuSignCompleteLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/30 p-8 max-w-md w-full">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-600">Please wait while we process your request...</p>
        </div>
      </div>
    </div>
  );
}

/**
 * DocuSign Signing Completion Page
 * 
 * This page is shown after any user (iPay Admin, Organization Owner, or Borrower) 
 * completes signing a document in DocuSign. It provides success feedback and 
 * redirects to the appropriate dashboard.
 */
export default function DocuSignCompletePage() {
  return (
    <Suspense fallback={<DocuSignCompleteLoading />}>
      <DocuSignCompleteContent />
    </Suspense>
  );
}