import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key (bypasses RLS)
const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      ssn,
      address,
      city,
      state,
      zip_code,
      employment_status,
      annual_income,
    } = body;

    // Validate required fields
    if (!first_name || !last_name || !email || !date_of_birth || !ssn || !address || !city || !state || !zip_code || !employment_status || !annual_income) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if borrower already exists with this email
    const { data: existingBorrower } = await supabase
      .from('borrowers')
      .select('id')
      .eq('email', email)
      .single();

    if (existingBorrower) {
      return NextResponse.json(
        { error: 'Borrower with this email already exists' },
        { status: 409 }
      );
    }

    // Create new borrower
    const { data: borrower, error } = await supabase
      .from('borrowers')
      .insert({
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        ssn_last_four: ssn.slice(-4), // Store only last 4 digits
        address_line1: address, // Map address to address_line1
        city,
        state,
        zip_code,
        country: 'US', // Default to US
        employment_status,
        annual_income,
        kyc_status: 'pending', // Default status
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating borrower:', error);
      return NextResponse.json(
        { error: 'Failed to create borrower' },
        { status: 500 }
      );
    }

    return NextResponse.json(borrower, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    const { data: borrowers, error } = await supabase
      .from('borrowers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching borrowers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch borrowers' },
        { status: 500 }
      );
    }

    return NextResponse.json(borrowers);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
