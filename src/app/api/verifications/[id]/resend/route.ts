import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';

// POST - Resend verification email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // Get authenticated user from cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const isAdmin = profile.role === 'admin';
    const { id } = await params;

    // Get verification
    const { data: verification, error: fetchError } = await adminClient
      .from('verifications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !verification) {
      return NextResponse.json(
        { error: 'Verification not found' },
        { status: 404 }
      );
    }

    // Check organization access
    if (!isAdmin && verification.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if verification is already completed
    if (verification.status === 'completed') {
      return NextResponse.json(
        { error: 'Verification already completed' },
        { status: 400 }
      );
    }

    // Check if verification has expired
    if (verification.expires_at && new Date(verification.expires_at) < new Date()) {
      // Extend expiration by 7 days
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      await adminClient
        .from('verifications')
        .update({
          expires_at: newExpiresAt.toISOString(),
          status: 'pending',
        })
        .eq('id', id);
    }

    // Get organization details for email
    const { data: organization } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', verification.organization_id)
      .single();

    // Build verification URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify/${verification.verification_token}`;

    // Send verification email
    const emailResponse = await fetch(`${baseUrl}/api/verifications/${id}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        verificationUrl,
        organizationName: organization?.name || 'Our Organization',
      }),
    });

    if (!emailResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update email tracking
    await adminClient
      .from('verifications')
      .update({
        email_sent_at: new Date().toISOString(),
        email_sent_count: (verification.email_sent_count || 0) + 1,
        status: verification.status === 'pending' ? 'email_sent' : verification.status,
      })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Verification email resent successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/verifications/[id]/resend:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
