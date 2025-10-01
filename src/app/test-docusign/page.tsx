'use client';

import { useState } from 'react';

interface DocuSignResult {
  success: boolean;
  envelopeId?: string;
  status?: string;
  message?: string;
  error?: string;
}

export default function TestDocuSignPage() {
  const [loanId, setLoanId] = useState('');
  const [result, setResult] = useState<DocuSignResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testDocuSign = async () => {
    if (!loanId.trim()) {
      setError('Please enter a loan ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/docusign/create-envelope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: loanId.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      setResult(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Full error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          DocuSign Integration Test
        </h1>
        <p className="text-gray-600 mb-6">Test the DocuSign envelope creation without authentication</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loan ID
            </label>
            <input
              type="text"
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
              placeholder="Enter loan ID from test data"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Run <code className="bg-gray-100 px-1 py-0.5 rounded">npm run test:create-loan</code> to generate test data
            </p>
          </div>

          <button
            onClick={testDocuSign}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Envelope...
              </span>
            ) : (
              'Test DocuSign Integration'
            )}
          </button>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-green-800 mb-2">Success!</p>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Envelope ID:</strong> {result.envelopeId}</p>
                    <p><strong>Status:</strong> {result.status}</p>
                    <p><strong>Message:</strong> {result.message}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What to check after success:
          </h2>
          <ol className="text-sm space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="font-semibold mr-2 text-purple-600">1.</span>
              <span>Check <strong>architex.development@gmail.com</strong> for iPay email (arrives immediately)</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2 text-purple-600">2.</span>
              <span>Check <strong>ssalas.wt@gmail.com</strong> for Borrower email (after iPay signs)</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2 text-purple-600">3.</span>
              <span>Check <strong>jgarcia@easycarus.com</strong> for Organization email (after Borrower signs)</span>
            </li>
            <li className="flex items-start">
              <span className="font-semibold mr-2 text-purple-600">4.</span>
              <span>Check your browser console for detailed logs</span>
            </li>
          </ol>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="font-semibold text-blue-900 mb-2 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Quick Commands:
          </h2>
          <div className="text-xs space-y-1 text-blue-800 font-mono">
            <p><strong>Create test data:</strong> npm run test:create-loan</p>
            <p><strong>Clean up:</strong> npm run test:cleanup</p>
          </div>
        </div>
      </div>
    </div>
  );
}
