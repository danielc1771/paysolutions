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

// GET - Get verification by token (public endpoint for verification flow)
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Get verification by token
    // Note: Using explicit foreign key relationship name to avoid ambiguity
    const { data: verification, error } = await supabase
      .from('verifications')
      .select(`
        *,
        organization:organizations!verifications_organization_id_fkey(id, name)
      `)
      .eq('verification_token', token)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Verification not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching verification:', error);
      return NextResponse.json(
        { error: 'Failed to fetch verification' },
        { status: 500 }
      );
    }

    // Check if verification has expired
    if (verification.expires_at && new Date(verification.expires_at) < new Date()) {
      return NextResponse.json(
        {
          error: 'Verification link has expired',
          expired: true,
        },
        { status: 410 }
      );
    }

    // Check if verification is already completed
    if (verification.status === 'completed') {
      return NextResponse.json(
        {
          error: 'Verification already completed',
          completed: true,
        },
        { status: 400 }
      );
    }

    // Get organization settings
    const { data: orgSettings } = await supabase
      .from('organization_settings')
      .select('verifications_require_phone')
      .eq('organization_id', verification.organization_id)
      .single();

    return NextResponse.json({
      success: true,
      verification: {
        id: verification.id,
        first_name: verification.first_name,
        last_name: verification.last_name,
        email: verification.email,
        phone: verification.phone,
        status: verification.status,
        stripe_verification_status: verification.stripe_verification_status,
        phone_verification_status: verification.phone_verification_status,
        organization: verification.organization,
      },
      requiresPhone: orgSettings?.verifications_require_phone || false,
    });
  } catch (error) {
    console.error('Error in GET /api/verifications/by-token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
