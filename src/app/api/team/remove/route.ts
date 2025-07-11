import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import { z } from 'zod';

const removeSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
});

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validationResult = removeSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { memberId } = validationResult.data;

    // Get current user's profile and organization
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to remove team members (organization owner, admin, or user)
    if (currentProfile.role !== 'organization_owner' && currentProfile.role !== 'admin' && currentProfile.role !== 'user') {
      return NextResponse.json(
        { error: 'Insufficient permissions to remove team members' },
        { status: 403 }
      );
    }

    // Get the member to be removed
    const { data: memberToRemove, error: memberError } = await supabase
      .from('profiles')
      .select('id, role, organization_id, email')
      .eq('id', memberId)
      .single();

    if (memberError || !memberToRemove) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    // Check if member belongs to the same organization
    if (memberToRemove.organization_id !== currentProfile.organization_id) {
      return NextResponse.json(
        { error: 'Cannot remove team member from different organization' },
        { status: 403 }
      );
    }

    // Prevent removing organization owners and system admins
    if (memberToRemove.role === 'organization_owner') {
      return NextResponse.json(
        { error: 'Cannot remove organization owner' },
        { status: 400 }
      );
    }

    if (memberToRemove.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot remove system administrator' },
        { status: 400 }
      );
    }

    // Prevent users from removing themselves
    if (memberToRemove.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself' },
        { status: 400 }
      );
    }

    // Remove the user from auth using admin client (this will cascade to profile via database triggers/policies)
    const supabaseAdmin = await createAdminClient();
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(memberId);
    
    if (deleteAuthError) {
      console.error('Auth deletion error:', deleteAuthError);
      
      // Handle specific error cases
      if (deleteAuthError.code === 'not_admin') {
        return NextResponse.json(
          { error: 'Insufficient permissions to remove this team member' },
          { status: 403 }
        );
      }
      
      if (deleteAuthError.message.includes('User not found')) {
        return NextResponse.json(
          { error: 'Team member not found or already removed' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to remove team member from authentication' },
        { status: 500 }
      );
    }

    // Remove profile record (should happen automatically, but let's be explicit)
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', memberId);

    if (deleteProfileError) {
      console.error('Profile deletion error:', deleteProfileError);
      // Don't fail the request since auth deletion succeeded
    }

    console.log('✅ Team member removed successfully:', {
      memberId,
      email: memberToRemove.email,
      organizationId: currentProfile.organization_id
    });

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully'
    });

  } catch (error) {
    console.error('❌ Team member removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}