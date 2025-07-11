import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getHomepageForRole } from '@/lib/auth/roles';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile to determine role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/login');
  }

  // Redirect based on user role
  const homepage = getHomepageForRole(profile.role as any);
  redirect(homepage);
}
