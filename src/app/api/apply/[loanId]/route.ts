
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAndSendEnvelope } from '@/utils/docusign/jwt-client';
import { 
  mapLoanDataToDocuSignFields, 
  getBorrowerFullName, 
  getBorrowerEmail,
  type LoanApplicationData 
} from '@/utils/docusign/field-mapper';

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
    // First, get the loan data without joins to ensure we get the loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        borrower_id,
        organization_id,
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
        verified_phone_number
      `)
      .eq('id', loanId)
      .single();

    if (loanError)  {
      console.log('❌ Loan query error:', loanError);
      throw new Error('Loan not found');
    }
    
    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.status !== 'application_sent' && loan.status !== 'application_in_progress') {
      throw new Error('This application has already been submitted or is invalid.');
    }

    console.log('✅ Loan found:', loan.id);

    // Get borrower data if borrower_id exists
    let borrowerData = null;
    if (loan.borrower_id) {
      const { data: borrower } = await supabase
        .from('borrowers')
        .select('id, email, kyc_status')
        .eq('id', loan.borrower_id)
        .single();
      borrowerData = borrower;
    }

    // Get organization data if organization_id exists
    let organizationName = null;
    if (loan.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', loan.organization_id)
        .single();
      organizationName = org?.name;
    }

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
        ...(borrowerData || {}),
        first_name: loan.customer_first_name,
        last_name: loan.customer_last_name,
      },
      dealerName: organizationName,
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
    
    console.log('💰 Annual Income Processing:', {
      original: validation.data.annualIncome,
      type: typeof validation.data.annualIncome,
      parsed: annualIncomeValue
    });

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
        address: validation.data.address, // For DocuSign compatibility
        address_line1: validation.data.address, // Primary address field
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

    // Create DocuSign envelope after successful application submission using NEW JWT system
    try {
      // Fetch loan and borrower data with payment schedule for DocuSign
      const { data: loanData, error: fetchError } = await supabase
        .from('loans')
        .select(`
          *,
          borrower:borrowers(*)
        `)
        .eq('id', loanId)
        .single();

      if (fetchError || !loanData) {
        console.error('❌ Error fetching loan data for DocuSign:', fetchError);
        throw new Error('Failed to fetch loan data for DocuSign');
      }

      // Fetch payment schedule for this loan
      const { data: paymentSchedule, error: scheduleError } = await supabase
        .from('payment_schedules')
        .select('*')
        .eq('loan_id', loanId)
        .order('payment_number', { ascending: true });

      if (scheduleError) {
        console.warn('⚠️ Failed to fetch payment schedule:', scheduleError);
      }

      // Add payment schedule to loan data
      const loanWithSchedule = {
        ...loanData,
        payment_schedule: paymentSchedule || []
      } as LoanApplicationData;

      console.log('📋 Loan data prepared for DocuSign:', {
        loanNumber: loanData.loan_number,
        borrowerEmail: loanData.borrower.email,
        borrowerName: `${loanData.borrower.first_name} ${loanData.borrower.last_name}`,
        paymentScheduleEntries: paymentSchedule?.length || 0
      });

      // Prepare borrower information
      const borrowerName = getBorrowerFullName(loanWithSchedule);
      const borrowerEmail = getBorrowerEmail(loanWithSchedule);

      // Map loan data to DocuSign template fields using the field mapper
      const docusignFields = mapLoanDataToDocuSignFields(loanWithSchedule);

      console.log('📝 Fields to populate:', Object.keys(docusignFields).length);

      // Create envelope and send to all signers via email using NEW JWT client
      const result = await createAndSendEnvelope(
        borrowerName,
        borrowerEmail,
        docusignFields
      );

      console.log('✅ DocuSign envelope created:', result.envelopeId);

      // Update loan with DocuSign envelope ID and status
      const { error: docusignUpdateError } = await supabase
        .from('loans')
        .update({
          docusign_envelope_id: result.envelopeId,
          docusign_status: 'sent',
          docusign_status_updated: new Date().toISOString(),
          status: 'pending_ipay_signature'
        })
        .eq('id', loanId);

      if (docusignUpdateError) {
        console.error('❌ Error updating loan with DocuSign data:', docusignUpdateError);
        // Don't fail the request since envelope was created successfully
      } else {
        console.log('✅ Loan updated with DocuSign envelope ID:', result.envelopeId);
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

// PATCH handler to update verification status
export async function PATCH(request: Request, { params }: { params: Promise<{ loanId: string }> }) {
  const { loanId } = await params;
  const supabase = await createClient();

  try {
    const body = await request.json();
    console.log('📝 PATCH request to update loan:', loanId, body);

    const updates: Record<string, unknown> = {};

    if (body.stripe_verification_status) {
      updates.stripe_verification_status = body.stripe_verification_status;
    }

    if (body.stripe_verification_session_id) {
      updates.stripe_verification_session_id = body.stripe_verification_session_id;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No updates provided' }, { status: 400 });
    }

    const { error } = await supabase
      .from('loans')
      .update(updates)
      .eq('id', loanId);

    if (error) {
      console.error('Error updating loan:', error);
      throw error;
    }

    console.log('✅ Loan updated successfully:', updates);

    return NextResponse.json({ success: true, message: 'Loan updated successfully' });

  } catch (error: unknown) {
    console.error('Error in PATCH handler:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new NextResponse(JSON.stringify({ message: errorMessage }), { status: 500 });
  }
}
