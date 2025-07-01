# Role-Based Access Control Setup Guide

## Overview
This guide explains how to set up and test the three-role authentication system:
- **Admin**: Full system access across all organizations
- **User**: Dealership staff with access to their organization only  
- **Borrower**: Customers with read-only access to their loan information

## Database Schema Updates

### 1. Update Role Enum
The role enum has been updated in the schema file to include 'borrower':
```sql
-- This change is already made in src/drizzle/schema/schema.ts
export const roleEnum = pgEnum('role', ['admin', 'user', 'borrower']);
```

### 2. Apply Database Migration
You'll need to apply the role enum change to your database. This requires either:

**Option A: Using Supabase Dashboard**
1. Go to SQL Editor in Supabase Dashboard
2. Run: `ALTER TYPE role ADD VALUE 'borrower';`

**Option B: Using Migration**
1. Generate a new migration with the enum change
2. Apply it to your database

### 3. Create Test Data
Run the SQL script in `setup-test-accounts.sql` to create test accounts and organizations.

## Test Accounts

### Admin Account
- **Email**: `admin.test@paysolutions.com`
- **Password**: `TestAdmin123!`
- **Role**: `admin`
- **Access**: Can see all organizations and data
- **Homepage**: `/admin/dashboard`

### User Accounts

#### User 1 (Easycar Organization)
- **Email**: `user1.test@easycar.com`
- **Password**: `TestUser123!`
- **Role**: `user`
- **Organization**: `easycar`
- **Access**: Only easycar organization data
- **Homepage**: `/dashboard`

#### User 2 (Test Dealership 2)
- **Email**: `user2.test@dealership2.com`
- **Password**: `TestUser123!`
- **Role**: `user`
- **Organization**: `Test Dealership 2`
- **Access**: Only Test Dealership 2 organization data
- **Homepage**: `/dashboard`

### Borrower Accounts

#### Borrower 1
- **Email**: `borrower1.test@gmail.com`
- **Password**: `TestBorrower123!`
- **Role**: `borrower`
- **Associated**: John Doe, Loan LOAN-TEST-001
- **Access**: Only their loan information
- **Homepage**: `/borrower/dashboard`

#### Borrower 2
- **Email**: `borrower2.test@gmail.com`
- **Password**: `TestBorrower123!`
- **Role**: `borrower`
- **Associated**: Jane Smith, Loan LOAN-TEST-002
- **Access**: Only their loan information
- **Homepage**: `/borrower/dashboard`

## Setting Up Test Accounts

### 1. Create Supabase Auth Users
For each test account, you need to create the user in Supabase Auth:

```javascript
// Use Supabase Admin Client or Dashboard
const { data, error } = await supabase.auth.admin.createUser({
  email: 'admin.test@paysolutions.com',
  password: 'TestAdmin123!',
  email_confirm: true
});
```

### 2. Run Test Data SQL
Execute the `setup-test-accounts.sql` script in your Supabase SQL Editor.

### 3. Update Profile IDs
Update the profile UUIDs in the SQL script to match the user IDs created in Supabase Auth.

## Role-Based Features

### Route Protection
- **Admin routes**: `/admin/*` - Only admin role
- **User routes**: `/dashboard/*` - Only user and admin roles
- **Borrower routes**: `/borrower/*` - Only borrower role
- **Public routes**: `/apply/*`, `/payment-*` - No authentication required

### Data Access Patterns

#### Admin Role
```typescript
// Can access all organizations
const loans = await getAllLoans(); // No org filter
const borrowers = await getAllBorrowers(); // No org filter
```

#### User Role
```typescript
// Only their organization's data
const loans = await getOrganizationLoans(profile.organizationId);
const borrowers = await getOrganizationBorrowers(profile.organizationId);
```

#### Borrower Role
```typescript
// Only their own loan data
const loan = await getBorrowerLoan(profile.email);
const payments = await getBorrowerPayments(profile.email);
```

### Conditional Rendering Helpers

```typescript
import { RolePermissions } from '@/lib/auth/roles';

// Single role checks
{RolePermissions.isAdmin(profile) && <AdminPanel />}
{RolePermissions.isUser(profile) && <UserDashboard />}
{RolePermissions.isBorrower(profile) && <BorrowerPortal />}

// Combined role checks
{RolePermissions.isStaff(profile) && <LoanManagement />}
{RolePermissions.canViewAllLoans(profile) && <AllLoansView />}
```

## Development Testing

### Testing Different Roles
1. Use different browsers or incognito windows for each role
2. Log in with the test accounts
3. Verify route access and data visibility
4. Test organization data isolation

### Testing Organization Isolation
1. Log in as `user1.test@easycar.com`
2. Verify you only see easycar's loans and borrowers
3. Log in as `user2.test@dealership2.com`
4. Verify you only see Test Dealership 2's data
5. Log in as admin to verify you see all data

### Testing Borrower Access
1. Log in as `borrower1.test@gmail.com`
2. Verify you only see John Doe's loan information
3. Try to access other borrower data (should be blocked)
4. Test payment functionality

## API Authorization

All API routes should use the authorization helpers:

```typescript
import { requireAuth, withAuth, AuthErrors } from '@/lib/auth/utils';

// Require specific role
export async function GET() {
  try {
    const { profile, dataAccess } = await requireAuth(['admin', 'user']);
    // Handle request with authorized profile
  } catch (error) {
    return AuthErrors.unauthorized();
  }
}

// Use auth wrapper
export async function POST() {
  return withAuth(async (profile, dataAccess) => {
    // Authorized logic here
    const orgFilter = dataAccess.getOrganizationFilter();
    return Response.json({ data: 'success' });
  }, ['admin']);
}
```

## Next Steps

1. **Apply database migrations** for the role enum
2. **Create test accounts** in Supabase Auth
3. **Run the test data SQL** script
4. **Update existing middleware** to use new role system
5. **Update API routes** with proper authorization
6. **Test each role's access patterns**
7. **Build borrower dashboard** components

## Files Created

- `src/lib/auth/roles.ts` - Role definitions and permissions
- `src/lib/auth/utils.ts` - Authorization utilities
- `setup-test-accounts.sql` - Test data setup
- `ROLE_SETUP_GUIDE.md` - This setup guide