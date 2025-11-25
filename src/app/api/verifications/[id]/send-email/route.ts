import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import { sendVerificationEmail } from '@/utils/mailer';

// POST - Send verification email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { verificationUrl, organizationName } = body;

    if (!verificationUrl || !organizationName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const adminClient = await createAdminClient();

    // Fetch verification details to get email and name
    const { data: verification, error: fetchError } = await adminClient
      .from('verifications')
      .select('email, first_name, last_name')
      .eq('id', id)
      .single();

    if (fetchError || !verification) {
      console.error('Error fetching verification:', fetchError);
      return NextResponse.json(
        { error: 'Verification not found' },
        { status: 404 }
      );
    }

    // Send the email using Resend
    await sendVerificationEmail({
      to: verification.email,
      firstName: verification.first_name,
      verificationUrl,
      organizationName,
    });

    console.log('Verification email sent successfully:', {
      verificationId: id,
      to: verification.email,
      organizationName,
    });

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/verifications/[id]/send-email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
