
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createTemplateBasedEnvelope, DatabaseLoanData } from '@/utils/docusign/templates';
import { createEnvelopesApi } from '@/utils/docusign/client';
import { Language } from '@/utils/translations';

const loanApplicationSchema = z.object({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  employmentStatus: z.string().min(1, "Employment status is required"),
  annualIncome: z.union([z.string(), z.number()]).refine((val) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return !isNaN(num) && num > 0;
  }, {
    message: "Annual income must be a valid positive number"
  }),
  currentEmployerName: z.string().optional(),
  timeWithEmployment: z.string().optional(),
  reference1Name: z.string().optional(),
  reference1Phone: z.string().optional(),
  reference1Email: z.string().optional(),
  reference2Name: z.string().optional(),
  reference2Phone: z.string().optional(),
  reference2Email: z.string().optional(),
  reference3Name: z.string().optional(),
  reference3Phone: z.string().optional(),
  reference3Email: z.string().optional(),
  // Stripe verification
  stripeVerificationStatus: z.string().optional(),
  // Consent preferences
  consentToContact: z.boolean().optional(),
  consentToText: z.boolean().optional(),
  consentToCall: z.boolean().optional(),
  communicationPreferences: z.string().optional(),
});

// GET handler to fetch initial loan data
export async function GET(request: Request, { params }: { params: Promise<{ loanId: string }> }) {
  const { loanId } = await params;
  const supabase = await createClient();

  try {
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        principal_amount,
        status,
        vehicle_year,
        vehicle_make,
        vehicle_model,
        vehicle_vin,
        customer_first_name,
        customer_last_name,
        application_step,
        stripe_verification_session_id,
        stripe_verification_status,
        phone_verification_session_id,
        phone_verification_status,
        verified_phone_number,
        borrowers(
          id,
          email,
          kyc_status
        ),
        organizations(name)
      `)
      .eq('id', loanId)
      .single();

    if (loanError)  {
      console.log(loanError);
      throw new Error('Loan not found');
    }
    if (loan.status !== 'application_sent' && loan.status !== 'application_in_progress') {
      throw new Error('This application has already been submitted or is invalid.');
    }

    console.log(loan);

    return NextResponse.json({
      loan: {
        principal_amount: loan.principal_amount,
        vehicleYear: loan.vehicle_year,
        vehicleMake: loan.vehicle_make,
        vehicleModel: loan.vehicle_model,
        vehicleVin: loan.vehicle_vin,
        applicationStep: loan.application_step,
        stripeVerificationSessionId: loan.stripe_verification_session_id,
        stripeVerificationStatus: loan.stripe_verification_status,
        phoneVerificationSessionId: loan.phone_verification_session_id,
        phoneVerificationStatus: loan.phone_verification_status,
        verifiedPhoneNumber: loan.verified_phone_number,
      },
      borrower: {
        ...loan.borrowers,
        first_name: loan.customer_first_name,
        last_name: loan.customer_last_name,
      },
      dealerName: (loan.organizations as unknown as Record<string, unknown>)?.name,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new NextResponse(JSON.stringify({ message: errorMessage }), { status: 404 });
  }
}

// POST handler to submit the completed application
export async function POST(request: Request, { params }: { params: Promise<{ loanId: string }> }) {
  const { loanId } = await params;
  const supabase = await createClient();

  try {
    const body = await request.json();
    console.log('📋 Final submission body:', JSON.stringify(body, null, 2));
    
    const validation = loanApplicationSchema.safeParse(body);

    if (!validation.success) {
      console.log('❌ Final submission validation errors:', validation.error.issues);
      return new NextResponse(JSON.stringify({ message: 'Invalid form data.', errors: validation.error.issues }), { status: 400 });
    }

    console.log('✅ Final submission validation passed');

    const { data: loan } = await supabase
      .from('loans')
      .select('borrower_id, status')
      .eq('id', loanId)
      .single();

    console.log('🔍 Loan data for submission:', loan);

    if (!loan) {
      throw new Error('Loan not found.');
    }

    // Allow updates for applications that are in progress or sent
    if (loan.status !== 'application_sent' && loan.status !== 'application_in_progress') {
      console.log(`❌ Invalid loan status for submission: ${loan.status}`);
      throw new Error(`This application has already been completed or is invalid. Current status: ${loan.status}`);
    }

    console.log('✅ Loan status is valid for submission:', loan.status);

    // Safely parse annual income
    const annualIncomeValue = typeof validation.data.annualIncome === 'string' 
      ? parseFloat(validation.data.annualIncome) 
      : validation.data.annualIncome;

    // Prepare communication consent data
    const consentData = {
      consentToContact: validation.data.consentToContact,
      consentToText: validation.data.consentToText,
      consentToCall: validation.data.consentToCall,
      communicationPreferences: validation.data.communicationPreferences
    };

    const { error: borrowerUpdateError } = await supabase
      .from('borrowers')
      .update({
        date_of_birth: validation.data.dateOfBirth,
        address_line1: validation.data.address,
        city: validation.data.city,
        state: validation.data.state,
        zip_code: validation.data.zipCode,
        employment_status: validation.data.employmentStatus,
        annual_income: annualIncomeValue,
        current_employer_name: validation.data.currentEmployerName || null,
        time_with_employment: validation.data.timeWithEmployment || null,
        reference1_name: validation.data.reference1Name || null,
        reference1_phone: validation.data.reference1Phone || null,
        reference1_email: validation.data.reference1Email || null,
        reference2_name: validation.data.reference2Name || null,
        reference2_phone: validation.data.reference2Phone || null,
        reference2_email: validation.data.reference2Email || null,
        reference3_name: validation.data.reference3Name || null,
        reference3_phone: validation.data.reference3Phone || null,
        reference3_email: validation.data.reference3Email || null,
        // Communication consent
        communication_consent: JSON.stringify(consentData),
        // Update KYC status based on Stripe verification
        kyc_status: validation.data.stripeVerificationStatus === 'completed' ? 'completed' : 'pending',
      })
      .eq('id', loan.borrower_id);

    if (borrowerUpdateError) throw borrowerUpdateError;

    // Update loan status to completed (we'll store consent preferences in borrower record for now)
    const { error: loanUpdateError } = await supabase
      .from('loans')
      .update({ 
        status: 'application_completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', loanId);

    if (loanUpdateError) throw loanUpdateError;

    console.log('✅ Application submitted successfully, now creating DocuSign envelope...');

    // Create DocuSign envelope after successful application submission
    try {
      // Fetch complete loan and borrower data for DocuSign, including organization and payment schedules
      const { data: completeLoans, error: fetchError } = await supabase
        .from('loans')
        .select(`
          *,
          borrower:borrowers(*),
          organization:organizations(*),
          payment_schedules(*)
        `)
        .eq('id', loanId)
        .single();

      if (fetchError || !completeLoans) {
        console.error('❌ Error fetching complete loan data for DocuSign:', fetchError);
        throw new Error('Failed to fetch loan data for DocuSign');
      }

      // Transform data for DocuSign template (using DatabaseLoanData format)
      const loanData: DatabaseLoanData = {
        id: completeLoans.id,
        loanNumber: completeLoans.loan_number,
        principalAmount: parseFloat(completeLoans.principal_amount),
        interestRate: parseFloat(completeLoans.interest_rate),
        termWeeks: completeLoans.term_weeks,
        weeklyPayment: parseFloat(completeLoans.weekly_payment),
        purpose: completeLoans.purpose,
        vehicleYear: completeLoans.vehicle_year,
        vehicleMake: completeLoans.vehicle_make,
        vehicleModel: completeLoans.vehicle_model,
        vehicleVin: completeLoans.vehicle_vin,
        customerFirstName: completeLoans.customer_first_name,
        customerLastName: completeLoans.customer_last_name,
        organizationId: completeLoans.organization_id,
        borrower: {
          id: completeLoans.borrower.id,
          firstName: completeLoans.borrower.first_name,
          lastName: completeLoans.borrower.last_name,
          email: completeLoans.borrower.email,
          phone: completeLoans.borrower.phone,
          dateOfBirth: completeLoans.borrower.date_of_birth,
          addressLine1: completeLoans.borrower.address_line1,
          city: completeLoans.borrower.city,
          state: completeLoans.borrower.state,
          zipCode: completeLoans.borrower.zip_code,
          employmentStatus: completeLoans.borrower.employment_status,
          annualIncome: parseFloat(completeLoans.borrower.annual_income || '0'),
          currentEmployerName: completeLoans.borrower.current_employer_name,
          timeWithEmployment: completeLoans.borrower.time_with_employment,
          reference1Name: completeLoans.borrower.reference1_name,
          reference1Phone: completeLoans.borrower.reference1_phone,
          reference1Email: completeLoans.borrower.reference1_email,
          reference2Name: completeLoans.borrower.reference2_name,
          reference2Phone: completeLoans.borrower.reference2_phone,
          reference2Email: completeLoans.borrower.reference2_email,
          reference3Name: completeLoans.borrower.reference3_name,
          reference3Phone: completeLoans.borrower.reference3_phone,
          reference3Email: completeLoans.borrower.reference3_email,
          organizationId: completeLoans.borrower.organization_id
        },
        organization: completeLoans.organization ? {
          id: completeLoans.organization.id,
          name: completeLoans.organization.name,
          email: completeLoans.organization.email,
          phone: completeLoans.organization.phone,
          address: completeLoans.organization.address,
          city: completeLoans.organization.city,
          state: completeLoans.organization.state,
          zipCode: completeLoans.organization.zip_code
        } : null,
        paymentSchedules: (completeLoans.payment_schedules || []).map((ps: Record<string, unknown>) => ({
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
        borrowerName: `${loanData.borrower.firstName} ${loanData.borrower.lastName}`,
        organizationName: loanData.organization?.name
      });

      // Get borrower's preferred language (kept for future template language support)
      const borrowerLanguage: Language = (completeLoans.borrower.preferred_language as Language) || 'en';
      console.log('🌍 Using language for document:', borrowerLanguage);

      // Create DocuSign envelope using template-based approach
      const { envelopesApi, accountId } = await createEnvelopesApi();
      const envelopeDefinition = await createTemplateBasedEnvelope(loanData);

      console.log('📤 Sending envelope to DocuSign...');

      const result = await envelopesApi.createEnvelope(accountId, {
        envelopeDefinition
      });

      if (!result || !result.envelopeId) {
        throw new Error('Failed to create DocuSign envelope');
      }

      console.log('✅ DocuSign envelope created:', result.envelopeId);

      // Update loan with DocuSign envelope ID and status - set status to 'new' for iPay admin signing
      const { error: docusignUpdateError } = await supabase
        .from('loans')
        .update({
          docusign_envelope_id: result.envelopeId,
          docusign_status: 'sent',
          docusign_status_updated: new Date().toISOString(),
          status: 'new'  // Set to 'new' so iPay admin can see the Sign DocuSign button
        })
        .eq('id', loanId);

      if (docusignUpdateError) {
        console.error('❌ Error updating loan with DocuSign data:', docusignUpdateError);
        // Don't fail the request since envelope was created successfully
      }

      return NextResponse.json({
        message: 'Application submitted successfully and DocuSign envelope created!',
        docusign: {
          envelopeId: result.envelopeId,
          status: 'sent'
        }
      });

    } catch (docusignError: unknown) {
      console.error('❌ DocuSign envelope creation failed:', docusignError);

      // Update loan status to indicate DocuSign creation failed
      await supabase
        .from('loans')
        .update({
          docusign_status: 'failed',
          docusign_status_updated: new Date().toISOString()
        })
        .eq('id', loanId);

      // Don't fail the entire application submission - just log the error
      return NextResponse.json({
        message: 'Application submitted successfully, but DocuSign envelope creation failed. Please contact support.',
        docusign: {
          error: docusignError instanceof Error ? docusignError.message : 'Unknown DocuSign error'
        }
      });
    }

  } catch (error: unknown) {
    console.error('Error submitting application:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new NextResponse(JSON.stringify({ message: errorMessage }), { status: 500 });
  }
}
