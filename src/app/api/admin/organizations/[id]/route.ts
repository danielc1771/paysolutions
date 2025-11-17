import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Get current user's profile and verify they are a system admin
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check if user has admin role
    if (currentProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only system administrators can delete organizations' },
        { status: 403 }
      );
    }

    // First check if the organization exists and get its details with related data
    const { data: organization, error: fetchError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        profiles(id, email, role, status),
        loans:loans(id, status, loan_number)
      `)
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching organization for deletion:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch organization details' },
        { status: 500 }
      );
    }

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if organization has any active loans
    const activeLoans = organization.loans?.filter(loan => 
      loan.status === 'active' || loan.status === 'funded'
    );

    if (activeLoans && activeLoans.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete organization with active loans',
          details: `Organization has ${activeLoans.length} active loan(s). Please close or transfer the loans before deletion.`
        },
        { status: 400 }
      );
    }

    // Get all users associated with this organization
    const userIds = organization.profiles?.map(profile => profile.id) || [];

    console.log('🗑️ Deleting organization:', {
      organizationId: id,
      organizationName: organization.name,
      userCount: userIds.length,
      loanCount: organization.loans?.length || 0
    });

    // Use admin client to delete auth users and profiles
    const supabaseAdmin = await createAdminClient();

    // Delete all auth users associated with this organization
    for (const userId of userIds) {
      try {
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteAuthError) {
          console.error(`Error deleting auth user ${userId}:`, deleteAuthError);
          // Continue with other deletions even if one fails
        } else {
          console.log(`✅ Deleted auth user: ${userId}`);
        }
      } catch (error) {
        console.error(`Error deleting auth user ${userId}:`, error);
        // Continue with other deletions
      }
    }

    // Delete all profiles associated with this organization
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('organization_id', id);

    if (profileDeleteError) {
      console.error('Error deleting profiles:', profileDeleteError);
      return NextResponse.json(
        { error: 'Failed to delete organization users' },
        { status: 500 }
      );
    }

    // Delete all loans associated with this organization (if any remain)
    const { error: loansDeleteError } = await supabase
      .from('loans')
      .delete()
      .eq('organization_id', id);

    if (loansDeleteError) {
      console.error('Error deleting loans:', loansDeleteError);
      // Continue with organization deletion
    }

    // Finally, delete the organization
    const { error: deleteError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting organization:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete organization' },
        { status: 500 }
      );
    }

    console.log('✅ Organization deleted successfully:', {
      organizationId: id,
      organizationName: organization.name,
      deletedUsers: userIds.length
    });

    return NextResponse.json({
      success: true,
      message: 'Organization and all associated users deleted successfully',
      deleted_organization: {
        id: organization.id,
        name: organization.name,
        deleted_users: userIds.length,
        deleted_loans: organization.loans?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Server error during organization deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
