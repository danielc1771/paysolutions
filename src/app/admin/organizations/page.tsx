'use client';

import AdminLayout from '@/components/AdminLayout';
import OrganizationsTable from '@/components/admin/OrganizationsTable';
import { RoleRedirect } from '@/components/auth/RoleRedirect';

export default function OrganizationsPage() {
  return (
    <RoleRedirect allowedRoles={['admin']}>
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
          <div className="p-8">
            <OrganizationsTable />
          </div>
        </div>
      </AdminLayout>
    </RoleRedirect>
  );
}