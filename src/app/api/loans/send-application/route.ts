
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendLoanApplicationEmail } from '@/utils/mailer';

const sendApplicationSchema = z.object({
  fullName: z.string(),
  loanAmount: z.number(),
  email: z.string().email(),
  vehicleYear: z.string().min(4).max(4), // Assuming year as string for now
  vehicleMake: z.string().nonempty(),
  vehicleModel: z.string().nonempty(),
  vehicleVin: z.string().length(17), // Standard VIN length
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.organization_id) {
    return new NextResponse(JSON.stringify({ message: 'Forbidden: User has no organization' }), { status: 403 });
  }

  const body = await request.json();
  const validation = sendApplicationSchema.safeParse(body);

  if (!validation.success) {
    return new NextResponse(JSON.stringify({ message: validation.error.message }), { status: 400 });
  }

  const { fullName, loanAmount, email, vehicleYear, vehicleMake, vehicleModel, vehicleVin } = validation.data;

  try {
    let borrowerId: string;

    const { data: existingBorrower } = await supabase
      .from('borrowers')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('email', email)
      .maybeSingle();

    if (existingBorrower) {
      borrowerId = existingBorrower.id;
    } else {
      const [firstName, ...lastNameParts] = fullName.split(' ');
      const lastName = lastNameParts.join(' ') || ' ';

      const { data: newBorrower, error: insertError } = await supabase
        .from('borrowers')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: email,
          organization_id: profile.organization_id,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      if (!newBorrower) throw new Error('Failed to create new borrower.');
      borrowerId = newBorrower.id;
    }

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .insert({
        loan_number: `LOAN-${Date.now()}`,
        borrower_id: borrowerId,
        principal_amount: loanAmount,
        status: 'APPLICATION_SENT',
        organization_id: profile.organization_id,
        interest_rate: 0.3,
        term_months: 12,
        monthly_payment: 100,
        vehicle_year: vehicleYear,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_vin: vehicleVin,
      })
      .select('id')
      .single();

    if (loanError) throw loanError;
    if (!loan) throw new Error('Failed to create loan record.');

    const applicationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/apply/${loan.id}`;

    await sendLoanApplicationEmail(email, fullName, applicationUrl);

    return NextResponse.json({ 
      message: `Application link successfully sent to ${email}.`,
      applicationUrl // For admin reference
    });

  } catch (error: any) {
    console.error('Error sending application:', error);
    return new NextResponse(JSON.stringify({ message: error.message }), { status: 500 });
  }
}
