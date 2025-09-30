import { NextRequest, NextResponse } from 'next/server';
import { createAndSendLoanEnvelope, extractTabLabels } from '@/utils/docusign/client';

// Interface for loan application data (matching your existing interface)
interface LoanApplicationData {
  // Borrower information
  borrowerName: string;
  borrowerEmail: string;
  borrowerFirstName?: string;
  borrowerLastName?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phoneNumber?: string;
  phoneCountryCode?: string;
  
  // Employment information
  employmentStatus?: string;
  annualIncome?: number;
  currentEmployerName?: string;
  employerState?: string;
  timeWithEmployment?: string;
  
  // Loan information
  loanAmount: number;
  loanType?: string;
  loanTerm?: string;
  interestRate?: string;
  monthlyPayment?: number;
  
  // Vehicle information
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  vehicleMileage?: string;
  vehiclePrice?: number;
  
  // Dealership information
  dealershipName?: string;
  dealershipAddress?: string;
  dealershipPhone?: string;
  
  // References
  reference1Name?: string;
  reference1Phone?: string;
  reference1Email?: string;
  reference1CountryCode?: string;
  reference2Name?: string;
  reference2Phone?: string;
  reference2Email?: string;
  reference2CountryCode?: string;
  reference3Name?: string;
  reference3Phone?: string;
  reference3Email?: string;
  
  // Additional fields
  [key: string]: unknown;
}

// Create and send envelope with loan application data
export async function POST(request: NextRequest) {
  try {
    const loanData: LoanApplicationData = await request.json();

    // Validate required fields
    if (!loanData.borrowerEmail || !loanData.borrowerName || !loanData.loanAmount) {
      return NextResponse.json(
        { error: 'borrowerEmail, borrowerName, and loanAmount are required' },
        { status: 400 }
      );
    }

    console.log('🚀 Creating envelope with loan application data for:', loanData.borrowerEmail);

    // Create and send envelope using new implementation
    const result = await createAndSendLoanEnvelope(loanData);

    console.log('✅ Loan application envelope sent successfully:', {
      envelopeId: result.envelopeId,
      status: (result as any).status,
      borrowerEmail: loanData.borrowerEmail
    });

    return NextResponse.json({
      success: true,
      message: 'Loan application envelope sent successfully',
      envelopeId: result.envelopeId,
      uri: (result as any).uri,
      status: (result as any).status,
      statusDateTime: (result as any).statusDateTime,
      borrowerEmail: loanData.borrowerEmail,
      borrowerName: loanData.borrowerName,
      loanAmount: loanData.loanAmount
    });

  } catch (error) {
    console.error('❌ Failed to create loan application envelope:', error);
    
    // Log detailed error information
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as any;
      console.error('DocuSign API Error Details:', {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create loan application envelope',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get available template tabs for debugging/mapping purposes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('templateId');
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'templateId query parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Extracting tab labels for template:', templateId);
    
    const tabLabels = await extractTabLabels(templateId);
    
    return NextResponse.json({
      success: true,
      templateId,
      availableTabLabels: tabLabels,
      totalTabs: tabLabels.length
    });

  } catch (error) {
    console.error('❌ Failed to get template tabs:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get template tabs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
