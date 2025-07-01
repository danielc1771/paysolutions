// Server-side only authorization utilities (for API routes and Server Components only)

import { cache } from 'react';
import type { UserProfile, Role } from './roles';
import { RolePermissions } from './roles';

// Dynamic import to avoid bundling server code in client
async function getServerSupabase() {
  const { createClient } = await import('@/utils/supabase/server');
  return createClient();
}

// Server-side profile fetching (cached) - only for API routes and server components
export const getServerProfile = cache(async (): Promise<UserProfile | null> => {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return null;
    }

    // Use Supabase client instead of Drizzle to avoid import issues
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
    console.error('Error fetching server profile:', error);
    return null;
  }
});

// Organization-scoped data access helpers
export class AuthorizedDataAccess {
  private profile: UserProfile;

  constructor(profile: UserProfile) {
    this.profile = profile;
  }

  // Get organization filter for queries
  getOrganizationFilter() {
    if (this.profile.role === 'admin') {
      // Admins can see all organizations - no filter
      return null;
    }
    
    if (this.profile.role === 'user') {
      // Users can only see their organization
      return this.profile.organizationId;
    }
    
    if (this.profile.role === 'borrower') {
      // Borrowers can only see their organization's data
      return this.profile.organizationId;
    }
    
    throw new Error('Invalid role');
  }

  // Check if user can access specific organization data
  canAccessOrganization(organizationId: string): boolean {
    return RolePermissions.canAccessOrganization(this.profile, organizationId);
  }

  // Check if user can perform action on loan
  canAccessLoan(loanOrganizationId: string, borrowerEmail?: string): boolean {
    if (this.profile.role === 'admin') return true;
    
    if (this.profile.role === 'user') {
      return this.profile.organizationId === loanOrganizationId;
    }
    
    if (this.profile.role === 'borrower') {
      return this.profile.email === borrowerEmail;
    }
    
    return false;
  }

  // Check if user can manage other users
  canManageUsers(targetOrganizationId?: string): boolean {
    if (this.profile.role === 'admin') return true;
    
    if (this.profile.role === 'user' && targetOrganizationId) {
      return this.profile.organizationId === targetOrganizationId;
    }
    
    return false;
  }
}

// Server-side authorization middleware helper
export async function requireAuth(requiredRole?: Role | Role[]): Promise<{
  profile: UserProfile;
  dataAccess: AuthorizedDataAccess;
}> {
  const profile = await getServerProfile();
  
  if (!profile) {
    throw new Error('Authentication required');
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowedRoles.includes(profile.role)) {
      throw new Error(`Insufficient permissions. Required role(s): ${allowedRoles.join(', ')}`);
    }
  }

  return {
    profile,
    dataAccess: new AuthorizedDataAccess(profile)
  };
}

// API route authorization helper
export async function withAuth<T>(
  handler: (profile: UserProfile, dataAccess: AuthorizedDataAccess) => Promise<T>,
  requiredRole?: Role | Role[]
): Promise<T> {
  const { profile, dataAccess } = await requireAuth(requiredRole);
  return handler(profile, dataAccess);
}

// Organization validation helper for API routes
export async function validateOrganizationAccess(organizationId: string): Promise<UserProfile> {
  const profile = await getServerProfile();
  
  if (!profile) {
    throw new Error('Authentication required');
  }

  if (!RolePermissions.canAccessOrganization(profile, organizationId)) {
    throw new Error('Access denied for this organization');
  }

  return profile;
}

// Borrower-specific validation for loan access
export async function validateBorrowerLoanAccess(
  loanId: string,
  borrowerEmail: string
): Promise<UserProfile> {
  const profile = await getServerProfile();
  
  if (!profile) {
    throw new Error('Authentication required');
  }

  if (profile.role === 'borrower' && profile.email !== borrowerEmail) {
    throw new Error('Access denied: Can only access your own loan information');
  }

  return profile;
}

// Error response helpers for API routes
export const AuthErrors = {
  unauthorized: () => Response.json({ error: 'Authentication required' }, { status: 401 }),
  forbidden: (message = 'Insufficient permissions') => 
    Response.json({ error: message }, { status: 403 }),
  organizationAccess: () => 
    Response.json({ error: 'Access denied for this organization' }, { status: 403 }),
  roleRequired: (role: Role | Role[]) => {
    const roles = Array.isArray(role) ? role.join(', ') : role;
    return Response.json({ error: `Required role(s): ${roles}` }, { status: 403 });
  }
};