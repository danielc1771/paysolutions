
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  // 1. Check if the current user is an admin
  const { data: { user: requestingUser } } = await supabase.auth.getUser();
  if (!requestingUser) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', requestingUser.id)
    .single();

  if (!profile || profile.role !== 'admin' || !profile.organization_id) {
    return new NextResponse('Forbidden: User is not an admin or has no organization', { status: 403 });
  }

  // 2. Validate the request body
  const body = await request.json();
  const validation = inviteSchema.safeParse(body);

  if (!validation.success) {
    return new NextResponse(validation.error.message, { status: 400 });
  }

  const { email, role } = validation.data;

  // 3. Use the admin client to invite the user
  const supabaseAdmin = await createAdminClient();
  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite`,
  });

  if (inviteError) {
    console.error('Error inviting user:', inviteError);
    return new NextResponse(inviteError.message, { status: 500 });
  }

  if (!inviteData || !inviteData.user) {
    console.error('No user returned from invite');
    return new NextResponse('Could not create user invitation.', { status: 500 });
  }

  // 4. Create a profile for the newly invited user
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: inviteData.user.id,
      organization_id: profile.organization_id,
      role: role,
      email: email, // Pre-populate email
    });

  if (profileError) {
    console.error('Error creating profile for invited user:', profileError);
    // Optional: Clean up the created user if profile creation fails
    await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
    return new NextResponse('Failed to create user profile after invitation.', { status: 500 });
  }

  return NextResponse.json({ message: 'User invited successfully' });
}

