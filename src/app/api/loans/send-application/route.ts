
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendLoanApplicationEmail } from '@/utils/mailer';
import { calculateLoanPayment, validateLoanTerms } from '@/utils/loan-calculations';

const sendApplicationSchema = z.object({
  customerName: z.string().nonempty(),
  customerEmail: z.string().email(),
  loanAmount: z.string().nonempty(),
  loanTerm: z.number().int().positive(),
  vehicleYear: z.string().nonempty(),
  vehicleMake: z.string().nonempty(),
  vehicleModel: z.string().nonempty(),
  vehicleVin: z.string().nonempty(),
  dealerName: z.string().optional(),
  dealerEmail: z.string().optional(),
  dealerPhone: z.string().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Auth error:', authError);
    return new NextResponse(JSON.stringify({ 
      error: 'Unauthorized', 
      message: 'Please log in to create loan applications' 
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.organization_id) {
    return new NextResponse(JSON.stringify({ 
      error: 'Forbidden', 
      message: 'User has no organization assigned' 
    }), { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(JSON.stringify({ 
      error: 'Invalid JSON', 
      message: 'Request body must be valid JSON' 
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const validation = sendApplicationSchema.safeParse(body);

  if (!validation.success) {
    console.error('Validation error:', validation.error);
    return new NextResponse(JSON.stringify({ 
      error: 'Invalid form data', 
      message: validation.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ')
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { customerName, customerEmail, loanAmount, loanTerm, vehicleYear, vehicleMake, vehicleModel, vehicleVin, dealerName } = validation.data;

  // Validate loan amount and term combination
  const loanAmountNum = parseFloat(loanAmount);
  if (!validateLoanTerms(loanAmountNum, loanTerm)) {
    return new NextResponse(JSON.stringify({ 
      error: 'Invalid loan term', 
      message: `${loanTerm} weeks is not available for $${loanAmountNum.toLocaleString()} loan amount` 
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Calculate loan payment details
  const loanCalculation = calculateLoanPayment(loanAmountNum, loanTerm);

  try {
    let borrowerId: string;

    const { data: existingBorrower, error: borrowerLookupError } = await supabase
      .from('borrowers')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('email', customerEmail)
      .maybeSingle();

    if (borrowerLookupError) {
      console.error('Error looking up existing borrower:', borrowerLookupError);
      throw new Error('Error checking for existing customer');
    }

    if (existingBorrower) {
      console.log(`Using existing borrower: ${existingBorrower.id} for email: ${customerEmail}`);
      borrowerId = existingBorrower.id;
    } else {
      const [firstName, ...lastNameParts] = customerName.split(' ');
      const lastName = lastNameParts.join(' ') || ' ';

      const { data: newBorrower, error: insertError } = await supabase
        .from('borrowers')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: customerEmail,
          organization_id: profile.organization_id,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      if (!newBorrower) throw new Error('Failed to create new borrower.');
      borrowerId = newBorrower.id;
    }

    // Check for existing loans with the same VIN and borrower
    const { data: existingLoan } = await supabase
      .from('loans')
      .select('id, loan_number')
      .eq('borrower_id', borrowerId)
      .eq('vehicle_vin', vehicleVin)
      .eq('organization_id', profile.organization_id)
      .maybeSingle();

    if (existingLoan) {
      throw new Error(`A loan application already exists for this customer and vehicle (VIN: ${vehicleVin}). Loan number: ${existingLoan.loan_number}`);
    }

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .insert({
        loan_number: `LOAN-${Date.now()}`,
        borrower_id: borrowerId,
        principal_amount: loanCalculation.principalAmount,
        status: 'application_sent',
        organization_id: profile.organization_id,
        interest_rate: loanCalculation.annualInterestRate,
        term_weeks: loanCalculation.termWeeks,
        weekly_payment: loanCalculation.weeklyPayment,
        vehicle_year: vehicleYear,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_vin: vehicleVin,
      })
      .select('id')
      .single();

    if (loanError) throw loanError;
    if (!loan) throw new Error('Failed to create loan record.');

    // Construct application URL - use request headers to get the base URL
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const applicationUrl = `${protocol}://${host}/apply/${loan.id}`;

    const [firstName] = customerName.split(' ');
    
    // Capitalize vehicle information properly
    const formatText = (text: string) => {
      return text.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    };
    
    const vehicleInfo = `${vehicleYear} ${formatText(vehicleMake)} ${formatText(vehicleModel)}`;
    
    await sendLoanApplicationEmail({
      to: customerEmail,
      firstName: formatText(firstName),
      applicationUrl: applicationUrl,
      loanAmount: loanAmount,
      dealerName: dealerName,
      vehicleInfo: vehicleInfo
    });

    return NextResponse.json({ 
      message: `Application link successfully sent to ${customerEmail}.`,
      applicationUrl // For admin reference
    });

  } catch (error: unknown) {
    console.error('Error sending application:', error);
    
    // Handle specific database errors
    let errorMessage = 'Failed to create loan application';
    let statusCode = 500;
    
    if (error && typeof error === 'object' && 'message' in error && 'code' in error) {
      const dbError = error as { message?: string; code?: string };
      if (dbError.message?.includes('duplicate') || dbError.code === '23505') {
        errorMessage = 'A loan application already exists for this customer with these details';
        statusCode = 409;
      } else if (dbError.message?.includes('foreign key') || dbError.code === '23503') {
        errorMessage = 'Invalid reference data provided';
        statusCode = 400;
      } else if (dbError.message?.includes('not null') || dbError.code === '23502') {
        errorMessage = 'Required information is missing';
        statusCode = 400;
      } else if (dbError.message) {
        errorMessage = dbError.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return new NextResponse(JSON.stringify({ 
      error: errorMessage,
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    }), { 
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
