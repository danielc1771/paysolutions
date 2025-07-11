// Client-side authorization utility functions

import { createClient } from '@/utils/supabase/client';
import type { UserProfile, Role } from './roles';

// Client-side profile fetching using Supabase client
export async function getClientProfile(): Promise<UserProfile | null> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error or no user:', authError);
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id, role, full_name, email, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile error or no profile:', profileError);
      return null;
    }

    // Validate the role is one of the expected values
    const validRoles: Role[] = ['admin', 'user', 'team_member', 'organization_owner', 'borrower'];
    if (!profile.role || !validRoles.includes(profile.role as Role)) {
      console.error('Invalid role:', profile.role);
      return null;
    }

    return {
      id: profile.id,
      organizationId: profile.organization_id,
      role: profile.role as Role,
      fullName: profile.full_name,
      email: profile.email,
      status: profile.status as 'INVITED' | 'ACTIVE'
    };
  } catch (error) {
    console.error('Error fetching client profile:', error);
    return null;
  }
}

