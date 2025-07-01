// Client-side authorization utility functions

import { createClient } from '@/utils/supabase/client';
import type { UserProfile, Role } from './roles';
import { getHomepageForRole } from './roles';

// Client-side profile fetching using Supabase client
export async function getClientProfile(): Promise<UserProfile | null> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id, role, full_name, email, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
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

// Role-based redirect helper
export function getRedirectUrl(profile: UserProfile | null, requestedPath: string): string | null {
  if (!profile) {
    return '/login';
  }

  // If accessing a role-specific area, redirect to appropriate homepage
  if (requestedPath.startsWith('/admin') && profile.role !== 'admin') {
    if (profile.role === 'user') return '/dashboard';
    if (profile.role === 'borrower') return '/borrower/dashboard';
  }

  if (requestedPath.startsWith('/dashboard') && profile.role === 'admin') {
    return '/admin/dashboard';
  }

  if (requestedPath.startsWith('/borrower') && profile.role !== 'borrower') {
    if (profile.role === 'admin') return '/admin/dashboard';
    if (profile.role === 'user') return '/dashboard';
  }

  return null;
}