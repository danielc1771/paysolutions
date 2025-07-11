import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getHomepageForRole, type Role } from '@/lib/auth/roles';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile to determine role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !profile || !profile.role) {
    console.error('Profile fetch error:', error);
    redirect('/login');
  }

  // Validate role before using it
  const validRoles: Role[] = ['admin', 'user', 'team_member', 'organization_owner', 'borrower'];
  if (!validRoles.includes(profile.role as Role)) {
    console.error('Invalid role:', profile.role);
    redirect('/login');
  }

  // Redirect based on user role
  const homepage = getHomepageForRole(profile.role as Role);
  redirect(homepage);
}
