import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import { z } from 'zod';

const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  email: z.string().email('Invalid email address'),
  contactPerson: z.string().min(1, 'Contact person name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  subscriptionStatus: z.enum(['trial', 'active', 'suspended', 'cancelled']),
  subscriptionStartDate: z.string().optional(),
  subscriptionEndDate: z.string().optional(),
  monthlyLoanLimit: z.number().min(1, 'Monthly loan limit must be at least 1'),
  totalUsersLimit: z.number().min(1, 'Total users limit must be at least 1'),
  // Optional fields
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  taxId: z.string().optional(),
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
    const validationResult = createOrganizationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      name,
      email,
      contactPerson,
      phone,
      subscriptionStatus,
      subscriptionStartDate,
      subscriptionEndDate,
      monthlyLoanLimit,
      totalUsersLimit,
      ...optionalFields
    } = validationResult.data;

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
        { error: 'Only system administrators can create organizations' },
        { status: 403 }
      );
    }

    // Check if email already exists in any organization
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email address already exists in the system' },
        { status: 400 }
      );
    }

    // Check if organization name already exists
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', name)
      .single();

    if (existingOrg) {
      return NextResponse.json(
        { error: 'An organization with this name already exists' },
        { status: 400 }
      );
    }

    // Create the organization first
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        email,
        phone,
        contact_person: contactPerson,
        subscription_status: subscriptionStatus,
        subscription_start_date: subscriptionStartDate ? new Date(subscriptionStartDate) : null,
        subscription_end_date: subscriptionEndDate ? new Date(subscriptionEndDate) : null,
        monthly_loan_limit: monthlyLoanLimit,
        total_users_limit: totalUsersLimit,
        ...optionalFields,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Organization creation error:', orgError);
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      );
    }

    // Create organization_owner invitation via Supabase Auth using admin client
    const supabaseAdmin = await createAdminClient();
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: contactPerson,
          organization_id: newOrg.id,
          role: 'organization_owner',
          invited_by: user.id
        },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`
      }
    );

    if (inviteError) {
      console.error('Supabase invite error:', inviteError);

      // Try to clean up the organization if invite failed
      await supabase.from('organizations').delete().eq('id', newOrg.id);

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

    // Create profile record for the invited organization owner using admin client
    const { error: profileCreateError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: inviteData.user.id,
        organization_id: newOrg.id,
        role: 'organization_owner',
        full_name: contactPerson,
        email: email,
        status: 'INVITED'
      });

    if (profileCreateError) {
      console.error('Profile creation error:', profileCreateError);
      // Try to clean up both the auth user and organization
      await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
      await supabase.from('organizations').delete().eq('id', newOrg.id);
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    console.log('✅ Organization created and owner invitation sent successfully:', {
      organizationId: newOrg.id,
      organizationName: name,
      ownerEmail: email,
      contactPerson,
    });

    return NextResponse.json({
      success: true,
      message: 'Organization created and invitation sent successfully',
      organization: {
        id: newOrg.id,
        name: newOrg.name,
        email: newOrg.email,
        contactPerson: newOrg.contact_person,
        subscriptionStatus: newOrg.subscription_status,
        monthlyLoanLimit: newOrg.monthly_loan_limit,
        totalUsersLimit: newOrg.total_users_limit,
      },
      invitedOwner: {
        id: inviteData.user.id,
        email: email,
        fullName: contactPerson
      }
    });

  } catch (error) {
    console.error('❌ Organization creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
