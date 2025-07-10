import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const loanProgressSchema = z.object({
  applicationStep: z.number().optional(),
  dateOfBirth: z.string().optional().refine((val) => !val || val.trim() !== '', {
    message: "Date of birth cannot be empty"
  }),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  employmentStatus: z.string().optional(),
  annualIncome: z.union([z.string(), z.number()]).optional(),
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

export async function POST(request: Request, { params }: { params: Promise<{ loanId: string }> }) {
  const { loanId } = await params;
  const supabase = await createClient();

  try {
    const body = await request.json();
    console.log('📝 Save progress request body:', JSON.stringify(body, null, 2));
    
    const validation = loanProgressSchema.safeParse(body);

    if (!validation.success) {
      console.log('❌ Validation errors:', validation.error.issues);
      return new NextResponse(JSON.stringify({ message: 'Invalid form data.', errors: validation.error.issues }), { status: 400 });
    }

    console.log('✅ Validation passed for dateOfBirth:', validation.data.dateOfBirth);

    const { data: loan } = await supabase
      .from('loans')
      .select('borrower_id, status')
      .eq('id', loanId)
      .single();

    if (!loan) {
      throw new Error('Loan not found.');
    }

    // Update borrower information
    const updateData: Record<string, unknown> = {};
    
    // Only update fields that have valid values
    if (validation.data.dateOfBirth && validation.data.dateOfBirth.trim() !== '' && validation.data.dateOfBirth !== 'null' && validation.data.dateOfBirth !== 'undefined') {
      updateData.date_of_birth = validation.data.dateOfBirth;
    }
    if (validation.data.address && validation.data.address.trim() !== '') {
      updateData.address_line1 = validation.data.address;
    }
    if (validation.data.city && validation.data.city.trim() !== '') {
      updateData.city = validation.data.city;
    }
    if (validation.data.state && validation.data.state.trim() !== '') {
      updateData.state = validation.data.state;
    }
    if (validation.data.zipCode && validation.data.zipCode.trim() !== '') {
      updateData.zip_code = validation.data.zipCode;
    }
    if (validation.data.employmentStatus && validation.data.employmentStatus.trim() !== '') {
      updateData.employment_status = validation.data.employmentStatus;
    }
    if (validation.data.annualIncome) {
      updateData.annual_income = typeof validation.data.annualIncome === 'string' ? parseFloat(validation.data.annualIncome) || null : validation.data.annualIncome;
    }
    if (validation.data.currentEmployerName && validation.data.currentEmployerName.trim() !== '') {
      updateData.current_employer_name = validation.data.currentEmployerName;
    }
    if (validation.data.timeWithEmployment && validation.data.timeWithEmployment.trim() !== '') {
      updateData.time_with_employment = validation.data.timeWithEmployment;
    }
    
    // References
    if (validation.data.reference1Name && validation.data.reference1Name.trim() !== '') {
      updateData.reference1_name = validation.data.reference1Name;
    }
    if (validation.data.reference1Phone && validation.data.reference1Phone.trim() !== '') {
      updateData.reference1_phone = validation.data.reference1Phone;
    }
    if (validation.data.reference1Email && validation.data.reference1Email.trim() !== '') {
      updateData.reference1_email = validation.data.reference1Email;
    }
    if (validation.data.reference2Name && validation.data.reference2Name.trim() !== '') {
      updateData.reference2_name = validation.data.reference2Name;
    }
    if (validation.data.reference2Phone && validation.data.reference2Phone.trim() !== '') {
      updateData.reference2_phone = validation.data.reference2Phone;
    }
    if (validation.data.reference2Email && validation.data.reference2Email.trim() !== '') {
      updateData.reference2_email = validation.data.reference2Email;
    }
    if (validation.data.reference3Name && validation.data.reference3Name.trim() !== '') {
      updateData.reference3_name = validation.data.reference3Name;
    }
    if (validation.data.reference3Phone && validation.data.reference3Phone.trim() !== '') {
      updateData.reference3_phone = validation.data.reference3Phone;
    }
    if (validation.data.reference3Email && validation.data.reference3Email.trim() !== '') {
      updateData.reference3_email = validation.data.reference3Email;
    }
    
    // KYC Status
    if (validation.data.stripeVerificationStatus && validation.data.stripeVerificationStatus.trim() !== '') {
      updateData.kyc_status = validation.data.stripeVerificationStatus;
    }

    // Communication Consent (store as JSON in notes field for now)
    if (validation.data.consentToContact !== undefined || 
        validation.data.consentToText !== undefined || 
        validation.data.consentToCall !== undefined || 
        validation.data.communicationPreferences !== undefined) {
      
      const consentData = {
        consentToContact: validation.data.consentToContact,
        consentToText: validation.data.consentToText,
        consentToCall: validation.data.consentToCall,
        communicationPreferences: validation.data.communicationPreferences
      };
      
      // Store as JSON string in a text field (we'll need to add this field to schema)
      updateData.communication_consent = JSON.stringify(consentData);
    }

    // Only update if there's data to update
    let borrowerUpdateError = null;
    if (Object.keys(updateData).length > 0) {
      console.log('🔄 Updating borrower with data:', JSON.stringify(updateData, null, 2));
      const { error } = await supabase
        .from('borrowers')
        .update(updateData)
        .eq('id', loan.borrower_id);
      borrowerUpdateError = error;
      
      if (error) {
        console.log('❌ Borrower update error:', error);
      } else {
        console.log('✅ Borrower updated successfully');
      }
    } else {
      console.log('ℹ️ No data to update for borrower');
    }

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

  } catch (error: unknown) {
    console.error('Error saving progress:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new NextResponse(JSON.stringify({ message: errorMessage }), { status: 500 });
  }
}
