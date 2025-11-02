import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import { z } from 'zod';

const inviteSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
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
    const validationResult = inviteSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { fullName, email } = validationResult.data;

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

    // Check if user has permission to invite (organization owner, admin, or user)
    if (currentProfile.role !== 'organization_owner' && currentProfile.role !== 'admin' && currentProfile.role !== 'user') {
      return NextResponse.json(
        { error: 'Insufficient permissions to invite team members' },
        { status: 403 }
      );
    }

    // Check if email already exists in the organization
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .eq('organization_id', currentProfile.organization_id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'A team member with this email already exists' },
        { status: 400 }
      );
    }

    // Create user invitation via Supabase Auth using admin client
    const supabaseAdmin = await createAdminClient();
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: fullName,
          organization_id: currentProfile.organization_id,
          role: 'team_member',
          invited_by: user.id
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`
      }
    );

    if (inviteError) {
      console.error('Supabase invite error:', inviteError);
      
      // Handle specific error cases
      if (inviteError.message.includes('already been registered') || inviteError.code === 'email_exists') {
        return NextResponse.json(
          { error: 'A user with this email address already exists. Please use a different email address.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      );
    }

    // Create profile record for the invited user using admin client
    const { error: profileCreateError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: inviteData.user.id,
        organization_id: currentProfile.organization_id,
        role: 'team_member',
        full_name: fullName,
        email: email,
        status: 'INVITED'
      });

    if (profileCreateError) {
      console.error('Profile creation error:', profileCreateError);
      // Try to clean up the auth user if profile creation failed
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    console.log('✅ Team member invitation sent successfully:', {
      email,
      fullName,
      organizationId: currentProfile.organization_id
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      invitedUser: {
        id: inviteData.user.id,
        email: email,
        fullName: fullName
      }
    });

  } catch (error) {
    console.error('❌ Team invitation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}