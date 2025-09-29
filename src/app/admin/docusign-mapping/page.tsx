'use client';

import { useState } from 'react';

export default function DocuSignMappingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [templateAnalysis, setTemplateAnalysis] = useState<any>(null);
  const [envelopeTest, setEnvelopeTest] = useState<any>(null);
  const [templateTest, setTemplateTest] = useState<any>(null);

  const analyzeTemplate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/docusign/analyze-template');
      const data = await response.json();
      setTemplateAnalysis(data);
    } catch (error) {
      setTemplateAnalysis({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testEnvelopeWithMapping = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test/docusign-envelope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Complete test data matching template tab labels
          borrowerName: 'John Smith',
          borrowerEmail: 'john.smith@example.com',
          borrowerFirstName: 'John',
          borrowerLastName: 'Smith',
          dateOfBirth: '1985-06-15',
          address: '123 Main Street',
          city: 'Miami',
          state: 'FL',
          zipCode: '33101',
          country: 'United States',
          phoneNumber: '5551234567',
          phoneCountryCode: '+1',
          
          // Employment
          employmentStatus: 'Full-time',
          annualIncome: 75000,
          currentEmployerName: 'Tech Corp Inc',
          employerState: 'FL',
          timeWithEmployment: '3 years',
          
          // Loan details
          loanAmount: 25000,
          loanType: 'Personal Loan',
          loanTerm: '48 months',
          interestRate: '8.5%',
          monthlyPayment: 612.50,
          
          // Vehicle
          vehicleYear: '2020',
          vehicleMake: 'Toyota',
          vehicleModel: 'Camry',
          vehicleVin: '1HGBH41JXMN109186',
          vehicleMileage: '45000',
          vehiclePrice: 28000,
          
          // Dealership
          dealershipName: 'PaySolutions Auto',
          dealershipAddress: '456 Business Blvd, Miami, FL 33102',
          dealershipPhone: '(555) 987-6543',
          
          // References with country codes
          reference1Name: 'Jane Doe',
          reference1Phone: '5551112222',
          reference1Email: 'jane.doe@email.com',
          reference1CountryCode: '+1',
          reference2Name: 'Bob Johnson',
          reference2Phone: '5553334444',
          reference2Email: 'bob.johnson@email.com',
          reference2CountryCode: '+1',
          reference3Name: 'Alice Wilson',
          reference3Phone: '5555556666',
          reference3Email: 'alice.wilson@email.com'
        })
      });

      const data = await response.json();
      setEnvelopeTest(data);
    } catch (error) {
      setEnvelopeTest({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // New function to test the envelope creation with our new implementation
  const testNewEnvelopeCreation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/docusign/send-envelope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signerEmail: 'ssalas.wt@gmail.com',
          signerName: 'Sebastian Salas',
          templateId: '8b9711f2-c304-4467-aa5c-27ebca4b4cc4', // Using your actual template ID
          // Optional: add CC recipient
          // ccEmail: 'manager@example.com',
          // ccName: 'Manager Name'
        })
      });

      const data = await response.json();
      setEnvelopeTest(data);
    } catch (error) {
      setEnvelopeTest({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test loan application envelope with complete data mapping
  const testLoanApplicationEnvelope = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/docusign/loan-envelope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Complete test data matching template tab labels
          borrowerName: 'Sebastian Salas',
          borrowerEmail: 'ssalas.wt@gmail.com',
          borrowerFirstName: 'Sebastian',
          borrowerLastName: 'Salas',
          dateOfBirth: '1990-01-15',
          address: '123 Main Street',
          city: 'Miami',
          state: 'FL',
          zipCode: '33101',
          country: 'United States',
          phoneNumber: '5551234567',
          phoneCountryCode: '+1',
          
          // Employment
          employmentStatus: 'Full-time',
          annualIncome: 85000,
          currentEmployerName: 'PaySolutions Inc',
          employerState: 'FL',
          timeWithEmployment: '2 years',
          
          // Loan details
          loanAmount: 30000,
          loanType: 'Auto Loan',
          loanTerm: '60 months',
          interestRate: '7.5%',
          monthlyPayment: 595.50,
          
          // Vehicle
          vehicleYear: '2022',
          vehicleMake: 'Honda',
          vehicleModel: 'Civic',
          vehicleVin: '2HGFC2F59NH123456',
          vehicleMileage: '15000',
          vehiclePrice: 32000,
          
          // Dealership
          dealershipName: 'Miami Honda',
          dealershipAddress: '789 Auto Blvd, Miami, FL 33102',
          dealershipPhone: '(305) 555-0123',
          
          // References with country codes
          reference1Name: 'Maria Garcia',
          reference1Phone: '5551112222',
          reference1Email: 'maria.garcia@email.com',
          reference1CountryCode: '+1',
          reference2Name: 'Carlos Rodriguez',
          reference2Phone: '5553334444',
          reference2Email: 'carlos.rodriguez@email.com',
          reference2CountryCode: '+1',
          reference3Name: 'Ana Martinez',
          reference3Phone: '5555556666',
          reference3Email: 'ana.martinez@email.com'
        })
      });

      const data = await response.json();
      setEnvelopeTest(data);
    } catch (error) {
      setEnvelopeTest({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testTemplateAccess = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/docusign/test-template');
      const data = await response.json();
      setTemplateTest(data);
    } catch (error) {
      setTemplateTest({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">DocuSign Template Mapping Analysis</h1>
      
      {/* Quick Auth Section */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Authentication Required</h3>
        <p className="text-yellow-700 mb-3">
          If you see "No token data available" errors, you need to authenticate with DocuSign first.
        </p>
        <div className="flex gap-3">
          <a
            href="/api/auth/docusign/authorize"
            className="inline-block bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Authorize DocuSign
          </a>
          <button
            onClick={testTemplateAccess}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test Template Access'}
          </button>
        </div>
      </div>
      
      {/* Template Test Results */}
      {templateTest && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Template Access Test Results</h2>
          <div className="bg-gray-50 border border-gray-200 p-4 rounded text-sm overflow-auto max-h-96">
            <pre className="text-gray-800 whitespace-pre-wrap">{JSON.stringify(templateTest, null, 2)}</pre>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Analysis */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Step 1: Analyze Template</h2>
          <p className="text-gray-600 mb-4">
            Extract all available tabs from your DocuSign template to understand what fields can be populated.
          </p>
          <button
            onClick={analyzeTemplate}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-4"
          >
            {isLoading ? 'Analyzing...' : 'Analyze Template'}
          </button>
          
          {templateAnalysis && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Template Analysis Results:</h3>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded text-sm overflow-auto max-h-96">
                <pre className="text-gray-800 whitespace-pre-wrap">{JSON.stringify(templateAnalysis, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Envelope Test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Step 2: Test Envelope Creation</h2>
          <p className="text-gray-600 mb-4">
            Test envelope creation using the new DocuSign implementation following the official documentation.
          </p>
          <div className="flex flex-col gap-3 mb-4">
            <button
              onClick={testNewEnvelopeCreation}
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating Envelope...' : 'Test New Envelope Creation (Simple)'}
            </button>
            <button
              onClick={testLoanApplicationEnvelope}
              disabled={isLoading}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating Envelope...' : '🚀 Test Loan Application Envelope (Complete)'}
            </button>
            <button
              onClick={testEnvelopeWithMapping}
              disabled={isLoading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating Envelope...' : 'Test Envelope with Full Data Mapping (Legacy)'}
            </button>
          </div>
          
          {envelopeTest && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Envelope Test Results:</h3>
              <div className="bg-gray-50 border border-gray-200 p-4 rounded text-sm overflow-auto max-h-96">
                <pre className="text-gray-800 whitespace-pre-wrap">{JSON.stringify(envelopeTest, null, 2)}</pre>
              </div>
              
              {envelopeTest.success && envelopeTest.signingUrl && (
                <div className="mt-4">
                  <a
                    href={envelopeTest.signingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                  >
                    Open Signing URL
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mapping Configuration Display */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Current Tab Mapping Configuration</h2>
        <p className="text-gray-600 mb-4">
          This shows how DocuSign template tab labels are mapped to loan application data fields:
        </p>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded text-sm overflow-auto">
          <pre className="text-gray-800 whitespace-pre-wrap">{`
// Tab Mapping Configuration
const TAB_MAPPING = {
  // Borrower information tabs
  'borrower_name': 'borrowerName',
  'borrower_first_name': 'borrowerFirstName', 
  'borrower_last_name': 'borrowerLastName',
  'date_of_birth': 'dateOfBirth',
  'address': 'address',
  'city': 'city',
  'state': 'state',
  'zip_code': 'zipCode',
  'phone_number': 'phoneNumber',
  
  // Employment tabs
  'employment_status': 'employmentStatus',
  'annual_income': 'annualIncome',
  'employer_name': 'currentEmployerName',
  'time_with_employment': 'timeWithEmployment',
  
  // Loan tabs
  'loan_amount': 'loanAmount',
  'loan_term': 'loanTerm',
  'interest_rate': 'interestRate',
  'monthly_payment': 'monthlyPayment',
  
  // Vehicle tabs
  'vehicle_year': 'vehicleYear',
  'vehicle_make': 'vehicleMake',
  'vehicle_model': 'vehicleModel',
  'vehicle_vin': 'vehicleVin',
  'vehicle_mileage': 'vehicleMileage',
  'vehicle_price': 'vehiclePrice',
  
  // Dealership tabs
  'dealership_name': 'dealershipName',
  'dealership_address': 'dealershipAddress',
  'dealership_phone': 'dealershipPhone',
  
  // Reference tabs
  'reference1_name': 'reference1Name',
  'reference1_phone': 'reference1Phone',
  'reference1_email': 'reference1Email',
  // ... and so on for reference2 and reference3
};
          `}</pre>
        </div>
      </div>
    </div>
  );
}
