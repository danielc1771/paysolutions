import { NextRequest, NextResponse } from 'next/server';
import { generateLoanAgreementHTMLInline, LoanData } from '@/utils/docusign/templates-inline';
import { Language } from '@/utils/translations';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang');
  const language: Language = (lang === 'es') ? 'es' : 'en';
  try {
    // Sample loan data for preview
    const sampleLoanData: LoanData = {
      loanNumber: 'PREVIEW-001',
      principalAmount: 2000,
      interestRate: 0.30,
      termWeeks: 8,
      weeklyPayment: 292.45,
      purpose: 'Vehicle purchase',
      vehicle: {
        year: '2020',
        make: 'Honda',
        model: 'Civic',
        vin: '1HGBH41JXMN109186'
      },
      borrower: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '(555) 123-4567',
        addressLine1: '123 Main St',
        city: 'Miami',
        state: 'FL',
        zipCode: '33101',
        ssn: '***-**-1234',
        dateOfBirth: '01/15/1985',
        employmentStatus: 'Full-time',
        annualIncome: 50000,
        currentEmployerName: 'Tech Company Inc',
        timeWithEmployment: '2 years',
        reference1Name: 'Jane Smith',
        reference1Phone: '(555) 987-6543',
        reference1Email: 'jane.smith@example.com',
        reference2Name: 'Bob Johnson',
        reference2Phone: '(555) 456-7890',
        reference2Email: 'bob.johnson@example.com',
        reference3Name: '',
        reference3Phone: '',
        reference3Email: ''
      }
    };

    const html = generateLoanAgreementHTMLInline(sampleLoanData, language);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error: unknown) {
    console.error('❌ Error generating preview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate preview';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}