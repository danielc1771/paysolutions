
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

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
        stripe_verification_status,
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
        stripeVerificationStatus: loan.stripe_verification_status,
      },
      borrower: loan.borrowers,
      dealerName: loan.organizations?.name,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new NextResponse(JSON.stringify({ message: errorMessage }), { status: 404 });
  }
}

// POST handler to submit the completed application
export async function POST(request: Request, { params }: { params: { loanId: string } }) {
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

    return NextResponse.json({ message: 'Application submitted successfully' });

  } catch (error: unknown) {
    console.error('Error submitting application:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new NextResponse(JSON.stringify({ message: errorMessage }), { status: 500 });
  }
}
