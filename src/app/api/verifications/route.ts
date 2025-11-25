import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '@/utils/mailer';

// Helper to generate unique verification token
function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

// GET - List all verifications (organization-scoped by RLS)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role and feature flags
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const isAdmin = profile.role === 'admin';

    // Check if organization has verifications enabled (non-admin only)
    if (!isAdmin) {
      const { data: orgSettings } = await adminClient
        .from('organization_settings')
        .select('enable_standalone_verifications')
        .eq('organization_id', profile.organization_id)
        .single();

      // Allow access if feature is enabled OR if there's no settings record yet
      // (we'll add settings UI to enable this feature)
      if (orgSettings && orgSettings.enable_standalone_verifications === false) {
        return NextResponse.json(
          { error: 'Standalone verifications not enabled for this organization' },
          { status: 403 }
        );
      }
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query using admin client to bypass RLS
    let query = adminClient
      .from('verifications')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        status,
        stripe_verification_status,
        phone_verification_status,
        created_at,
        completed_at,
        expires_at,
        organization_id
        ${isAdmin ? ',organization:organizations!verifications_organization_id_fkey(id, name)' : ''}
      `, { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Status filtering
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Search by name or email
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: verifications, error, count } = await query;

    if (error) {
      console.error('Error fetching verifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch verifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      verifications,
      total: count || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/verifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new verification
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role and feature flags
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const isAdmin = profile.role === 'admin';

    // Check if organization has verifications enabled
    const { data: orgSettings } = await adminClient
      .from('organization_settings')
      .select('enable_standalone_verifications, verifications_require_phone')
      .eq('organization_id', profile.organization_id)
      .single();

    // Only block if explicitly disabled (allow if null/undefined or no settings record)
    if (!isAdmin && orgSettings?.enable_standalone_verifications === false) {
      return NextResponse.json(
        { error: 'Standalone verifications not enabled for this organization' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      phone,
      purpose,
    } = body;

    // Validate required fields
    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      );
    }

    // Validate phone if required by org settings
    if (orgSettings?.verifications_require_phone && !phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Generate unique verification token
    const verificationToken = generateVerificationToken();

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create verification record (using adminClient from above)
    const { data: verification, error } = await adminClient
      .from('verifications')
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        first_name,
        last_name,
        email: email.toLowerCase().trim(),
        phone,
        purpose,
        verification_token: verificationToken,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating verification:', error);
      return NextResponse.json(
        { error: 'Failed to create verification' },
        { status: 500 }
      );
    }

    // Get organization details for email
    const { data: organization } = await adminClient
      .from('organizations')
      .select('name, email')
      .eq('id', profile.organization_id)
      .single();

    // Build verification URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify/${verificationToken}`;

    // Send verification email directly using mailer
    try {
      await sendVerificationEmail({
        to: email.toLowerCase().trim(),
        firstName: first_name,
        verificationUrl,
        organizationName: organization?.name || 'Our Organization',
      });

      // Update email_sent_at and status
      await adminClient
        .from('verifications')
        .update({
          email_sent_at: new Date().toISOString(),
          email_sent_count: 1,
          status: 'email_sent',
        })
        .eq('id', verification.id);

      console.log('Verification email sent successfully to:', email);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Don't fail the request if email fails
    }

    // Note: Usage is tracked on completion, not creation (see webhook and verify-code routes)

    return NextResponse.json({
      success: true,
      id: verification.id,
      verification,
      verification_link: verificationUrl,
      message: 'Verification created successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/verifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
