'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, Loader2, AlertCircle } from 'lucide-react';

/**
 * DocuSign Completion Page
 * 
 * This page is shown after the borrower completes signing the document in DocuSign.
 * It checks the envelope status and provides feedback to the user.
 */
export default function DocuSignCompletePage() {
  const params = useParams();
  const router = useRouter();
  const loanId = params.loanId as string;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your signature...');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Get the envelope ID from the loan record
        const loanResponse = await fetch(`/api/apply/${loanId}`);
        if (!loanResponse.ok) {
          throw new Error('Failed to fetch loan details');
        }
        
        const loanData = await loanResponse.json();
        const envelopeId = loanData.loan?.docusign_envelope_id;
        
        if (!envelopeId) {
          throw new Error('No DocuSign envelope found for this loan');
        }

        // Check the envelope status
        const statusResponse = await fetch(`/api/docusign/envelope-status?envelopeId=${envelopeId}`);
        if (!statusResponse.ok) {
          throw new Error('Failed to check signature status');
        }

        const statusData = await statusResponse.json();
        
        if (statusData.status === 'completed') {
          setStatus('success');
          setMessage('Your document has been signed successfully!');
          
          // Redirect to success page after 3 seconds
          setTimeout(() => {
            router.push(`/apply/${loanId}/success`);
          }, 3000);
        } else if (statusData.status === 'declined') {
          setStatus('error');
          setMessage('The document signing was declined.');
        } else {
          setStatus('success');
          setMessage('Your signature has been recorded. Processing...');
          
          // Still redirect even if not fully completed
          setTimeout(() => {
            router.push(`/apply/${loanId}/success`);
          }, 3000);
        }
      } catch (error) {
        console.error('Error checking signature status:', error);
        setStatus('error');
        setMessage('Unable to verify signature status. Please contact support if this persists.');
      }
    };

    if (loanId) {
      checkStatus();
    }
  }, [loanId, router]);

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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
              <p className="text-gray-600">{message}</p>
              <p className="text-sm text-gray-500 mt-4">Redirecting you shortly...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => router.push(`/apply/${loanId}`)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg"
              >
                Return to Application
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
