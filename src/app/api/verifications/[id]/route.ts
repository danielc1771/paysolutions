import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';

// GET - Get single verification
export async function GET(
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

    // Build query using admin client
    // Use explicit FK names to avoid ambiguity
    let query = adminClient
      .from('verifications')
      .select(`
        *,
        creator:profiles!verifications_created_by_fkey(full_name, email),
        organization:organizations!verifications_organization_id_fkey(id, name)
      `)
      .eq('id', id);

    // Apply organization filtering for non-admin users
    if (!isAdmin) {
      query = query.eq('organization_id', profile.organization_id);
    }

    const { data: verification, error } = await query.single();

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

    return NextResponse.json({
      success: true,
      verification,
    });
  } catch (error) {
    console.error('Error in GET /api/verifications/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete verification
export async function DELETE(
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

    // First, check if verification exists and belongs to user's organization
    const { data: verification, error: fetchError } = await adminClient
      .from('verifications')
      .select('id, organization_id, status')
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

    // Prevent deletion of completed verifications (optional business logic)
    if (verification.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot delete completed verifications' },
        { status: 400 }
      );
    }

    // Delete the verification
    const { error: deleteError } = await adminClient
      .from('verifications')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting verification:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete verification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/verifications/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
