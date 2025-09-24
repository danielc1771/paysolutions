import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createTemplateBasedEnvelope, DatabaseLoanData } from '@/utils/docusign/templates';
import { createEnvelopesApi } from '@/utils/docusign/client';
import { Language } from '@/utils/translations';

export async function POST(request: NextRequest) {
  try {
    const { loanId } = await request.json();
    
    if (!loanId) {
      return NextResponse.json(
        { error: 'Loan ID is required' },
        { status: 400 }
      );
    }

    console.log('📋 Creating DocuSign envelope for loan:', loanId);

    const supabase = await createClient();

    // Get loan and borrower data including organization and payment schedules
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:borrowers(*),
        organization:organizations(*),
        payment_schedules(*)
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('❌ Error fetching loan:', loanError);
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Transform data for DocuSign template (using DatabaseLoanData format)
    const loanData: DatabaseLoanData = {
      id: loan.id,
      loanNumber: loan.loan_number,
      principalAmount: parseFloat(loan.principal_amount),
      interestRate: parseFloat(loan.interest_rate),
      termWeeks: loan.term_weeks,
      weeklyPayment: parseFloat(loan.weekly_payment),
      purpose: loan.purpose,
      vehicleYear: loan.vehicle_year,
      vehicleMake: loan.vehicle_make,
      vehicleModel: loan.vehicle_model,
      vehicleVin: loan.vehicle_vin,
      customerFirstName: loan.customer_first_name,
      customerLastName: loan.customer_last_name,
      organizationId: loan.organization_id,
      borrower: {
        id: loan.borrower.id,
        firstName: loan.borrower.first_name,
        lastName: loan.borrower.last_name,
        email: loan.borrower.email,
        phone: loan.borrower.phone,
        dateOfBirth: loan.borrower.date_of_birth,
        addressLine1: loan.borrower.address_line1,
        city: loan.borrower.city,
        state: loan.borrower.state,
        zipCode: loan.borrower.zip_code,
        employmentStatus: loan.borrower.employment_status,
        annualIncome: parseFloat(loan.borrower.annual_income || '0'),
        currentEmployerName: loan.borrower.current_employer_name,
        timeWithEmployment: loan.borrower.time_with_employment,
        reference1Name: loan.borrower.reference1_name,
        reference1Phone: loan.borrower.reference1_phone,
        reference1Email: loan.borrower.reference1_email,
        reference2Name: loan.borrower.reference2_name,
        reference2Phone: loan.borrower.reference2_phone,
        reference2Email: loan.borrower.reference2_email,
        reference3Name: loan.borrower.reference3_name,
        reference3Phone: loan.borrower.reference3_phone,
        reference3Email: loan.borrower.reference3_email,
        organizationId: loan.borrower.organization_id
      },
      organization: loan.organization ? {
        id: loan.organization.id,
        name: loan.organization.name,
        email: loan.organization.email,
        phone: loan.organization.phone,
        address: loan.organization.address,
        city: loan.organization.city,
        state: loan.organization.state,
        zipCode: loan.organization.zip_code
      } : null,
      paymentSchedules: (loan.payment_schedules || []).map((ps: Record<string, unknown>) => ({
        id: ps.id as string,
        paymentNumber: ps.payment_number as number,
        dueDate: ps.due_date as string,
        principalAmount: parseFloat(ps.principal_amount as string),
        interestAmount: parseFloat(ps.interest_amount as string),
        totalAmount: parseFloat(ps.total_amount as string),
        remainingBalance: parseFloat(ps.remaining_balance as string)
      }))
    };

    console.log('📋 Loan data prepared for DocuSign:', {
      loanNumber: loanData.loanNumber,
      borrowerEmail: loanData.borrower.email,
      borrowerName: `${loanData.borrower.firstName} ${loanData.borrower.lastName}`
    });

    // Get borrower's preferred language
    const borrowerLanguage: Language = (loan.borrower.preferred_language as Language) || 'en';
    console.log('🌍 Using language for document:', borrowerLanguage);

    // Create DocuSign envelope using template-based approach
    const { envelopesApi, accountId } = await createEnvelopesApi();
    const envelopeDefinition = await createTemplateBasedEnvelope(loanData);

    console.log('📤 Sending envelope to DocuSign...');
    
    try {
      const result = await envelopesApi.createEnvelope(accountId, {
        envelopeDefinition
      });

      if (!result || !result.envelopeId) {
        throw new Error('Failed to create DocuSign envelope');
      }

      console.log('✅ DocuSign envelope created:', result.envelopeId);

      // Update loan with DocuSign envelope ID and status
      const { error: updateError } = await supabase
        .from('loans')
        .update({
          docusign_envelope_id: result.envelopeId,
          docusign_status: 'sent',
          docusign_status_updated: new Date().toISOString()
        })
        .eq('id', loanId);

      if (updateError) {
        console.error('❌ Error updating loan with DocuSign data:', updateError);
        // Don't fail the request since envelope was created successfully
      }

      return NextResponse.json({
        success: true,
        envelopeId: result.envelopeId,
        message: 'Loan agreement sent for signature successfully!'
      });
      
    } catch (error: unknown) {
      const apiError = error as { response: { status: number; statusText: string; body: unknown; headers: unknown } };
      // Log detailed error information
      console.error('❌ DocuSign API Error Details:');
      if (apiError.response) {
        console.error('Status:', apiError.response.status);
        console.error('Status Text:', apiError.response.statusText);
        console.error('Response Body:', JSON.stringify(apiError.response.body, null, 2));
        console.error('Response Headers:', apiError.response.headers);
      }
      throw apiError;
    }

  } catch (error: unknown) {
    console.error('❌ DocuSign envelope creation error:', JSON.stringify(error));
  
    const errorMessage = error instanceof Error ? error.message : 'Failed to create DocuSign envelope';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const envelopeId = searchParams.get('envelopeId');
    const download = searchParams.get('download');

    if (!envelopeId) {
      return NextResponse.json(
        { error: 'Envelope ID is required' },
        { status: 400 }
      );
    }

    const { envelopesApi, accountId } = await createEnvelopesApi();

    if (download === 'true') {
      console.log('📄 Downloading PDF for envelope:', envelopeId);
      
      // For now, redirect to DocuSign's document view
      // TODO: Implement proper PDF download using DocuSign API
      return NextResponse.json({
        success: false,
        error: 'PDF download not yet implemented. Please use "View in DocuSign" button.',
        redirectUrl: `https://demo.docusign.net/documents/details/${envelopeId}`
      }, { status: 501 });
    } else {
      // Get envelope status
      console.log('📋 Getting envelope status:', envelopeId);
      
      const envelope = await envelopesApi.getEnvelope(accountId, envelopeId);
      
      return NextResponse.json({
        success: true,
        envelope: {
          envelopeId: envelope.envelopeId,
          status: envelope.status,
          statusDateTime: envelope.statusChangedDateTime,
          completedDateTime: envelope.completedDateTime
        }
      });
    }

  } catch (error: unknown) {
    console.error('❌ DocuSign envelope retrieval error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve envelope';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
