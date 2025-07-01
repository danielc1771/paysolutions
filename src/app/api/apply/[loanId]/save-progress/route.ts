import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const loanProgressSchema = z.object({
  applicationStep: z.number().optional(),
  dateOfBirth: z.string().optional(),
  ssn: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  employmentStatus: z.string().optional(),
  annualIncome: z.number().optional(),
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
  stripeVerificationSessionId: z.string().optional(),
  stripeVerificationStatus: z.string().optional(),
  consentToContact: z.boolean().optional(),
  consentToText: z.boolean().optional(),
  consentToCall: z.boolean().optional(),
  communicationPreferences: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: { loanId: string } }) {
  const { loanId } = await params;
  const supabase = await createClient();

  try {
    const body = await request.json();
    const validation = loanProgressSchema.safeParse(body);

    if (!validation.success) {
      console.log(validation.error.issues);
      return new NextResponse(JSON.stringify({ message: 'Invalid form data.', errors: validation.error.issues }), { status: 400 });
    }

    const { data: loan } = await supabase
      .from('loans')
      .select('borrower_id, status')
      .eq('id', loanId)
      .single();

    if (!loan) {
      throw new Error('Loan not found.');
    }

    // Update borrower information
    const { error: borrowerUpdateError } = await supabase
      .from('borrowers')
      .update({
        date_of_birth: validation.data.dateOfBirth,
        address_line1: validation.data.address,
        city: validation.data.city,
        state: validation.data.state,
        zip_code: validation.data.zipCode,
        employment_status: validation.data.employmentStatus,
        annual_income: validation.data.annualIncome,
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
        kyc_status: validation.data.stripeVerificationStatus,
      })
      .eq('id', loan.borrower_id);

    if (borrowerUpdateError) throw borrowerUpdateError;

    // Update loan information
    const { error: loanUpdateError } = await supabase
      .from('loans')
      .update({
        application_step: validation.data.applicationStep,
        stripe_verification_session_id: validation.data.stripeVerificationSessionId,
      })
      .eq('id', loanId);

    if (loanUpdateError) throw loanUpdateError;

    return NextResponse.json({ message: 'Progress saved successfully' });

  } catch (error: any) {
    console.error('Error saving progress:', error);
    return new NextResponse(JSON.stringify({ message: error.message }), { status: 500 });
  }
}
