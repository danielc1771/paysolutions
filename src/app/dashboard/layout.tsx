'use client';

import UserLayout from '@/components/UserLayout';
import { RoleRedirect } from '@/components/auth/RoleRedirect';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleRedirect allowedRoles={['user', 'team_member', 'organization_owner']}>
      <UserLayout>
        {children}
      </UserLayout>
    </RoleRedirect>
  );
}
