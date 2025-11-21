# Verifications Feature Setup Guide

## Overview
The Standalone Verifications feature allows organizations to verify customer identities without requiring a loan application. Organizations can be configured to have:
- **Loans only** (default for existing orgs)
- **Verifications only** (verification-only organizations)
- **Both Loans and Verifications**

## Feature Flags

Three new feature flags in `organization_settings`:

| Flag | Default | Description |
|------|---------|-------------|
| `enable_loans` | `true` | Show Loans, Create Loan, and Borrowers navigation |
| `enable_standalone_verifications` | `false` | Show Verifications navigation |
| `verifications_require_phone` | `true` | Require phone verification in addition to identity |

## Configuration Examples

### 1. Enable Verifications for an Organization

```sql
-- Enable verifications for a specific organization
UPDATE organization_settings
SET enable_standalone_verifications = true
WHERE organization_id = 'your-org-id-here';
```

### 2. Create a Verification-Only Organization

```sql
-- Disable loans, enable only verifications
UPDATE organization_settings
SET
  enable_loans = false,
  enable_standalone_verifications = true
WHERE organization_id = 'your-org-id-here';
```

This will:
- ✅ Show: Dashboard, Verifications, Team, Settings
- ❌ Hide: Loans, Create Loan, Borrowers

### 3. Enable Both Features

```sql
-- Enable both loans and verifications
UPDATE organization_settings
SET
  enable_loans = true,
  enable_standalone_verifications = true
WHERE organization_id = 'your-org-id-here';
```

This will show all navigation items.

### 4. Make Phone Verification Optional

```sql
-- Disable phone verification requirement
UPDATE organization_settings
SET verifications_require_phone = false
WHERE organization_id = 'your-org-id-here';
```

## Navigation Logic

The `UserLayout` component now conditionally renders navigation based on:

1. **User Role** (admin, organization_owner, user, team_member)
2. **Organization Settings** (feature flags)

### Navigation Visibility Matrix

| Nav Item | Roles | Requires Feature Flag |
|----------|-------|----------------------|
| Dashboard | All | None (always shown) |
| Create Loan | org users | `enable_loans = true` |
| Loans | All | `enable_loans = true` |
| **Verifications** | All | `enable_standalone_verifications = true` |
| Borrowers | All | `enable_loans = true` |
| Organizations | Admin only | None (admin always sees) |
| Team | Admin/Owners/Users | None (always shown) |

**Special Admin Rule**: Admins always see all navigation items regardless of their organization's settings (for cross-org management).

## Checking Current Settings

```sql
-- View settings for an organization
SELECT
  o.name as organization_name,
  os.enable_loans,
  os.enable_standalone_verifications,
  os.verifications_require_phone
FROM organizations o
LEFT JOIN organization_settings os ON o.id = os.organization_id
WHERE o.id = 'your-org-id-here';
```

## Creating Settings for New Organizations

When creating a new organization, you should also create its settings:

```sql
-- Insert organization (if not exists)
INSERT INTO organizations (id, name, email, phone)
VALUES ('new-org-id', 'Verification Only Org', 'contact@example.com', '+1234567890');

-- Create settings with verifications enabled
INSERT INTO organization_settings (organization_id, enable_loans, enable_standalone_verifications)
VALUES ('new-org-id', false, true);
```

## Troubleshooting

### Issue: "I enabled verifications but don't see the nav item"

**Solutions**:
1. Check you're running the latest migration with the new columns
2. Verify the setting in database:
   ```sql
   SELECT enable_standalone_verifications
   FROM organization_settings
   WHERE organization_id = 'your-org-id';
   ```
3. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)
4. Check browser console for any errors
5. Verify organization ID matches between your user profile and settings

### Issue: "Navigation shows but I get 403 errors"

The API routes check the feature flag. Ensure:
```sql
-- Verify settings exist
SELECT * FROM organization_settings WHERE organization_id = 'your-org-id';

-- If missing, create them
INSERT INTO organization_settings (organization_id, enable_standalone_verifications)
VALUES ('your-org-id', true);
```

### Issue: "Want to hide loans for all organizations by default"

Change the schema default:

```typescript
// In src/drizzle/schema/schema.ts
enableLoans: boolean("enable_loans").default(false), // Changed from true
```

Then generate and apply migration.

## Testing the Feature

1. **As Admin**: You should see all navigation items regardless of org settings
2. **As Org User**: Navigation should reflect your organization's feature flags
3. **Switch Organizations**: Different orgs should show different navigation based on their settings

## API Endpoints

All verification endpoints check the `enable_standalone_verifications` flag:

- `GET /api/verifications` - Returns 403 if feature not enabled
- `POST /api/verifications` - Returns 403 if feature not enabled
- Other verification endpoints follow same pattern

Admins bypass this check and can always access verification APIs.

## Next Steps

After enabling verifications, you'll need to:
1. Run database migration to add new columns
2. Set organization settings via SQL or admin UI
3. Refresh browser to see navigation changes
4. Create your first verification from dashboard

## Quick Enable Script

```sql
-- Quick script to enable verifications for your organization
-- Replace 'your-org-id' with actual ID

UPDATE organization_settings
SET enable_standalone_verifications = true
WHERE organization_id = 'your-org-id';

-- Verify it worked
SELECT
  o.name,
  os.enable_loans,
  os.enable_standalone_verifications
FROM organizations o
JOIN organization_settings os ON o.id = os.organization_id
WHERE o.id = 'your-org-id';
```

Save this query and run it when you need to enable verifications for new organizations!
