
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const loanApplicationSchema = z.object({
  dateOfBirth: z.string().nonempty(),
  ssn: z.string().nonempty(),
  address: z.string().nonempty(),
  city: z.string().nonempty(),
  state: z.string().nonempty(),
  zipCode: z.string().nonempty(),
  employmentStatus: z.string().nonempty(),
  annualIncome: z.string().nonempty(),
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
export async function GET(request: Request, { params }: { params: { loanId: string } }) {
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
        application_step,
        stripe_verification_session_id,
        borrowers(*),
        organizations(*)
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
      },
      borrower: loan.borrowers,
      dealerName: loan.organizations?.name,
    });

  } catch (error: any) {
    return new NextResponse(JSON.stringify({ message: error.message }), { status: 404 });
  }
}

// POST handler to submit the completed application
export async function POST(request: Request, { params }: { params: { loanId: string } }) {
  const { loanId } = await params;
  const supabase = await createClient();

  try {
    const body = await request.json();
    const validation = loanApplicationSchema.safeParse(body);

    if (!validation.success) {
      return new NextResponse(JSON.stringify({ message: 'Invalid form data.', errors: validation.error.issues }), { status: 400 });
    }

    const { data: loan } = await supabase
      .from('loans')
      .select('borrower_id, status')
      .eq('id', loanId)
      .single();

    if (!loan || loan.status !== 'application_sent') {
      throw new Error('This application cannot be updated.');
    }

    const { error: borrowerUpdateError } = await supabase
      .from('borrowers')
      .update({
        date_of_birth: validation.data.dateOfBirth,
        // SSN should be handled with extreme care. In a real app, this would be encrypted.
        // For this example, we are storing it as-is.
        // ssn: validation.data.ssn, 
        address_line1: validation.data.address,
        city: validation.data.city,
        state: validation.data.state,
        zip_code: validation.data.zipCode,
        employment_status: validation.data.employmentStatus,
        annual_income: parseFloat(validation.data.annualIncome),
        current_employer_name: validation.data.currentEmployerName,
        time_with_employment: validation.data.timeWithEmployment,
        reference1_name: validation.data.reference1Name,
        reference1_phone: validation.data.reference1Phone,
        reference1_email: validation.data.reference1Email,
        reference2_name: validation.data.reference2Name,
        reference2_phone: validation.data.reference2Phone,
        reference2_email: validation.data.reference2Email,
        reference3_name: validation.data.reference3Name,
        reference3_phone: validation.data.reference3Phone,
        reference3_email: validation.data.reference3Email,
        // Update KYC status based on Stripe verification
        kyc_status: validation.data.stripeVerificationStatus === 'completed' ? 'completed' : 'pending',
      })
      .eq('id', loan.borrower_id);

    if (borrowerUpdateError) throw borrowerUpdateError;

    // Store consent preferences in a separate table or add to loan metadata
    const consentData = {
      consent_to_contact: validation.data.consentToContact || false,
      consent_to_text: validation.data.consentToText || false,
      consent_to_call: validation.data.consentToCall || false,
      communication_preferences: validation.data.communicationPreferences || 'email',
      stripe_verification_status: validation.data.stripeVerificationStatus || 'pending'
    };

    const { error: loanUpdateError } = await supabase
      .from('loans')
      .update({ 
        status: 'application_completed',
        metadata: consentData 
      })
      .eq('id', loanId);

    if (loanUpdateError) throw loanUpdateError;

    return NextResponse.json({ message: 'Application submitted successfully' });

  } catch (error: any) {
    console.error('Error submitting application:', error);
    return new NextResponse(JSON.stringify({ message: error.message }), { status: 500 });
  }
}
