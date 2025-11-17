// Role-based authorization configuration
// Based on developer advice for role-based routing and conditional rendering

export type Role = 'admin' | 'user' | 'borrower' | 'team_member' | 'organization_owner';

export interface UserProfile {
  id: string;
  organizationId: string | null;
  role: Role;
  fullName: string | null;
  email: string | null;
  status: 'INVITED' | 'ACTIVE';
}

// Role-based route configuration
export const ROLE_ROUTES: Record<Role, string[]> = {
  admin: [
    '/dashboard',
    '/dashboard/*'
  ],
  user: [
    '/dashboard',
    '/dashboard/loans',
    '/dashboard/loans/create',
    '/dashboard/loans/*',
    '/dashboard/borrowers',
    '/dashboard/borrowers/*',
    '/dashboard/team',
    '/dashboard/team/*',
    '/dashboard/reports',
    '/dashboard/settings'
  ],
  team_member: [
    '/dashboard',
    '/dashboard/loans',
    '/dashboard/loans/create',
    '/dashboard/loans/*',
    '/dashboard/borrowers',
    '/dashboard/borrowers/*',
    '/dashboard/reports',
    '/dashboard/settings'
  ],
  organization_owner: [
    '/dashboard',
    '/dashboard/loans',
    '/dashboard/loans/create',
    '/dashboard/loans/*',
    '/dashboard/borrowers',
    '/dashboard/borrowers/*',
    '/dashboard/team',
    '/dashboard/team/*',
    '/dashboard/reports',
    '/dashboard/settings'
  ],
  borrower: [
    '/borrower',
    '/borrower/dashboard',
    '/borrower/loan',
    '/borrower/payments',
    '/borrower/payments/*',
    '/borrower/documents',
    '/borrower/profile'
  ]
};

// Homepage redirection for each role
export const ROLE_HOMEPAGES: Record<Role, string> = {
  admin: '/dashboard',
  user: '/dashboard',
  team_member: '/dashboard',
  organization_owner: '/dashboard',
  borrower: '/borrower/dashboard'
};

// Public routes that don't require authentication
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/accept-invite',
  '/auth/callback',
  '/apply/*',
  '/payment-setup',
  '/payment-collection/*',
  '/payment-summary/*'
];

// Route access checking functions
export function canAccessRoute(userRole: Role, path: string): boolean {
  if (!userRole || !path) {
    return false;
  }
  
  const allowedRoutes = ROLE_ROUTES[userRole];
  if (!allowedRoutes) {
    return false;
  }
  
  return allowedRoutes.some(route => {
    if (!route) return false;
    if (route.endsWith('/*')) {
      const basePath = route.slice(0, -2);
      return path.startsWith(basePath);
    }
    return path === route;
  });
}

export function getHomepageForRole(role: Role): string {
  if (!role || !ROLE_HOMEPAGES[role]) {
    return '/login';
  }
  return ROLE_HOMEPAGES[role];
}

export function isPublicRoute(path: string): boolean {
  if (!path) {
    return false;
  }
  
  return PUBLIC_ROUTES.some(route => {
    if (!route) return false;
    if (route.endsWith('/*')) {
      const basePath = route.slice(0, -2);
      return path.startsWith(basePath);
    }
    return path === route;
  });
}

// Conditional rendering helper functions for complex role combinations
export const RolePermissions = {
  // Single role checks
  isAdmin: (profile: UserProfile | null): boolean => profile?.role === 'admin',
  isUser: (profile: UserProfile | null): boolean => profile?.role === 'user',
  isBorrower: (profile: UserProfile | null): boolean => profile?.role === 'borrower',
  isTeamMember: (profile: UserProfile | null): boolean => profile?.role === 'team_member',
  isOrganizationOwner: (profile: UserProfile | null): boolean => profile?.role === 'organization_owner',
  
  // Combined role checks
  isAdminOrUser: (profile: UserProfile | null): boolean => 
    profile?.role === 'admin' || profile?.role === 'user',
  
  isStaff: (profile: UserProfile | null): boolean => 
    profile?.role === 'admin' || profile?.role === 'user' || profile?.role === 'team_member' || profile?.role === 'organization_owner',
  
  // Organization-level permissions
  canManageOrganization: (profile: UserProfile | null): boolean => 
    profile?.role === 'admin' || profile?.role === 'user' || profile?.role === 'organization_owner',
  
  canAccessDashboard: (profile: UserProfile | null): boolean => 
    profile?.role === 'admin' || profile?.role === 'user' || profile?.role === 'team_member' || profile?.role === 'organization_owner',
  
  // Organization-based checks
  isSameOrganization: (profile: UserProfile | null, organizationId: string): boolean =>
    profile?.organizationId === organizationId,
  
  // Admin override - admins can access any organization's data
  canAccessOrganization: (profile: UserProfile | null, organizationId: string): boolean =>
    profile?.role === 'admin' || profile?.organizationId === organizationId,
  
  // Loan access permissions
  canViewAllLoans: (profile: UserProfile | null): boolean => profile?.role === 'admin',
  
  canViewOrganizationLoans: (profile: UserProfile | null, organizationId?: string): boolean => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    if ((profile.role === 'user' || profile.role === 'team_member' || profile.role === 'organization_owner') && organizationId) {
      return profile.organizationId === organizationId;
    }
    return false;
  },
  
  canViewOwnLoan: (profile: UserProfile | null, borrowerEmail?: string): boolean => {
    if (!profile || !borrowerEmail) return false;
    return profile.role === 'borrower' && profile.email === borrowerEmail;
  },
  
  // User management permissions
  canManageUsers: (profile: UserProfile | null): boolean => profile?.role === 'admin',
  
  canManageOrganizationUsers: (profile: UserProfile | null, organizationId?: string): boolean => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    if ((profile.role === 'user' || profile.role === 'organization_owner') && organizationId) {
      return profile.organizationId === organizationId;
    }
    return false;
  },
  
  // Document access permissions
  canViewAllDocuments: (profile: UserProfile | null): boolean => profile?.role === 'admin',
  
  canViewOrganizationDocuments: (profile: UserProfile | null, organizationId?: string): boolean => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    return (profile.role === 'user' || profile.role === 'team_member' || profile.role === 'organization_owner') && profile.organizationId === organizationId;
  }
};

// Authorization error messages
export const AUTH_ERRORS = {
  NOT_AUTHENTICATED: 'User is not authenticated',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to access this resource',
  ORGANIZATION_ACCESS_DENIED: 'Access denied for this organization',
  ROLE_REQUIRED: (role: Role) => `This action requires ${role} role`,
  SAME_ORGANIZATION_REQUIRED: 'Can only access resources within your organization'
} as const;