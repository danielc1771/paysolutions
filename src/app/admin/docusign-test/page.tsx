'use client';

import { useState } from 'react';

export default function DocuSignTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleAuthorize = () => {
    setIsLoading(true);
    // Redirect to DocuSign authorization
    window.location.href = '/api/auth/docusign/authorize';
  };

  const testEnvelopeCreation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test/docusign-envelope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          borrowerName: 'John Smith',
          borrowerEmail: 'john.smith@example.com',
          loanAmount: 15000,
          vehicleYear: '2020',
          vehicleMake: 'Toyota',
          vehicleModel: 'Camry',
          vehicleVin: '1HGBH41JXMN109186',
          dealershipName: 'PaySolutions Auto'
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">DocuSign Integration Test</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Step 1: Authorize DocuSign</h2>
          <p className="text-gray-600 mb-4">
            First, you need to authorize the application to access DocuSign on your behalf.
          </p>
          <button
            onClick={handleAuthorize}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Redirecting...' : 'Authorize DocuSign'}
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Step 2: Test Envelope Creation</h2>
          <p className="text-gray-600 mb-4">
            After authorization, test creating a DocuSign envelope with sample data.
          </p>
          <button
            onClick={testEnvelopeCreation}
            disabled={isLoading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating Envelope...' : 'Test Envelope Creation'}
          </button>
        </div>

        {result && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Result</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
