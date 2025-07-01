
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendLoanApplicationEmail } from '@/utils/mailer';

const sendApplicationSchema = z.object({
  customerName: z.string().nonempty(),
  customerEmail: z.string().email(),
  loanAmount: z.string().nonempty(),
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

  const { customerName, customerEmail, loanAmount, vehicleYear, vehicleMake, vehicleModel, vehicleVin, dealerName } = validation.data;

  try {
    let borrowerId: string;

    const { data: existingBorrower } = await supabase
      .from('borrowers')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('email', customerEmail)
      .maybeSingle();

    if (existingBorrower) {
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

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .insert({
        loan_number: `LOAN-${Date.now()}`,
        borrower_id: borrowerId,
        principal_amount: parseFloat(loanAmount),
        status: 'application_sent',
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

  } catch (error: any) {
    console.error('Error sending application:', error);
    return new NextResponse(JSON.stringify({ message: error.message }), { status: 500 });
  }
}
