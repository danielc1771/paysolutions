'use client';

import OrganizationsTable from '@/components/dashboard/OrganizationsTable';
import { RoleRedirect } from '@/components/auth/RoleRedirect';

export default function OrganizationsPage() {
  return (
    <RoleRedirect allowedRoles={['admin']}>
      <div className="p-4 sm:p-6 lg:p-8">
        <OrganizationsTable />
      </div>
    </RoleRedirect>
  );
}
