# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
```bash
# Start development server (with Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Format code
npm run format
npm run format:check

# Test data management
npm run test:create-loan
npm run test:cleanup
```

### Database Commands
```bash
# Generate database schema migrations
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Push schema changes directly to database
npm run db:push

# Open Drizzle Studio for database management
npm run db:studio
```

## Architecture Overview

This is a **Next.js 15 loan management application** with multi-tenant, role-based architecture for financial institutions.

### Technology Stack
- **Framework**: Next.js 15 (App Router) with React 19
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Supabase Authentication
- **UI**: Tailwind CSS 4 with Framer Motion
- **Payments**: Stripe integration
- **Document Signing**: DocuSign integration
- **Communication**: Twilio (phone verification), Resend/Nodemailer (email)

### Core Database Schema
The application uses a multi-tenant architecture with the following key entities:

- **organizations** - Financial institutions/dealerships with subscription management (iPay as master organization)
- **profiles** - User accounts linked to auth.users, with role-based access
- **borrowers** - Loan applicants with KYC information and references
- **loans** - Loan applications with vehicle details, three-stage DocuSign signing status, and cached signing URLs
- **payment_schedules** - Generated weekly payment schedules
- **payments** - Payment records with Stripe integration
- **organization_settings** - Configurable organization-specific settings

#### Loan Status Progression (Three-Stage Signing)
- `new` → `application_sent` → `application_in_progress` → `application_completed`
- `application_completed` → `ipay_approved` → `dealer_approved` → `fully_signed`
- `review` → `approved` → `funded` → `closed` → `defaulted`

### Role-Based Access Control
Five roles defined in `src/lib/auth/roles.ts`:

1. **admin**: Full system access across all organizations (iPay super-admin)
2. **organization_owner**: Full access within their organization + team management
3. **user**: Dealership staff with organization-scoped access + team management
4. **team_member**: Limited organization-scoped access (no team management)
5. **borrower**: Read-only access to their own loan information

#### Organizational Structure
- **iPay Organization**: Master organization with admin users who oversee all other organizations
- **Child Organizations**: Individual dealerships/financial institutions (e.g., EasyCar)
- **Data Isolation**: Child organizations cannot see each other's data, only iPay admins have cross-organization access

**Route Protection**:
- `/admin/*` - Admin only
- `/dashboard/*` - Admin, organization_owner, user, team_member roles
- `/borrower/*` - Borrower role only
- `/apply/*`, `/payment-*` - Public routes

### Key Integration Points

#### DocuSign Integration
- **Three-stage signing workflow**: iPay Admin → Organization Owner → Borrower
- **Signing URL Caching**: 24-hour URL cache in database (`ipay_signing_url`, `organization_signing_url`, `borrower_signing_url`)
- **Smart Envelope Creation**: Automatic envelope creation if missing during signing process
- JWT authentication with RSA key pairs in `src/utils/docusign/`
- Template-based document generation using DocuSign template ID: `8b9711f2-c304-4467-aa5c-27ebca4b4cc4`
- Organization owner lookup via `src/utils/organization/owner-lookup.ts`
- Webhook handling at `/api/docusign/webhook` for multi-stage status tracking
- Status progression: `application_completed` → `ipay_approved` → `dealer_approved` → `fully_signed`
- **API Endpoints**: 
  - `/api/docusign/envelope` - Create DocuSign envelopes
  - `/api/docusign/signing-url` - Generate and cache signing URLs
  - `/api/docusign/webhook` - Handle DocuSign webhook events

#### Stripe Integration
- Payment method setup and recurring subscription management
- Identity verification sessions for borrower KYC
- Webhook handling at `/api/stripe/webhook` for payment events
- Server-only modules for secure API key handling

#### Supabase Integration
- Authentication with SSR support and middleware protection
- Row Level Security (RLS) policies for multi-tenant data isolation
- Client/server utilities in `src/utils/supabase/`
- Real-time database operations

#### Twilio Integration
- Phone verification services for borrower validation
- SMS-based OTP verification flows

### Application Flow
1. **Loan Origination**: Public application via `/apply/[loanId]` with borrower KYC
2. **Automatic DocuSign Envelope Creation**: Upon application completion, envelope is created and loan status set to `application_completed`
3. **Three-Stage Document Signing**:
   - **Stage 1**: iPay Admin signs first (via admin dashboard "Sign DocuSign" button) → `ipay_approved`
   - **Stage 2**: Organization Owner signs second (via dashboard signing button) → `dealer_approved`
   - **Stage 3**: Borrower completes final signature → `fully_signed`
4. **Identity Verification**: Stripe identity + Twilio phone verification (parallel to signing process)
5. **Payment Collection**: Automated Stripe recurring payments with schedules (after full signing)
6. **Multi-Tenant Management**: Organization isolation with iPay oversight

### File Structure Conventions
- **API Routes**: `/src/app/api/` - Server-side endpoints with role-based auth
- **Components**: `/src/components/` - Reusable UI with role-based rendering
- **Database**: `/src/drizzle/` - Schema, migrations, and type-safe queries
- **Utils**: `/src/utils/` - Third-party integrations (DocuSign, Stripe, Twilio)
- **Auth**: `/src/lib/auth/` - Role-based access control and middleware
- **Organization**: `/src/utils/organization/` - Organization owner lookup for DocuSign signing
- **Server-only**: Server-only modules for secure integrations

### Environment Variables Required
Copy `env.template` to `.env.local` and configure the required variables:

```bash
# Core Database & Auth
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Payment Processing (Production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Identity Verification (Optional - use test keys for verification while payments are in production)
# If not set, falls back to the main Stripe keys above
NEXT_PUBLIC_STRIPE_VERIFICATION_PUBLISHABLE_KEY=pk_test_...
STRIPE_VERIFICATION_SECRET_KEY=sk_test_...
STRIPE_VERIFICATION_WEBHOOK_SECRET=whsec_...

# Document Signing (DocuSign)
DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_USER_ID=
DOCUSIGN_ACCOUNT_ID=
DOCUSIGN_PRIVATE_KEY=
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_WEB_URL=https://demo.docusign.net

# Communication
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # Change to https://your-domain.com for production
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### Development Guidelines
- Database schema changes require migration via `npm run db:generate`
- Role-based access should use utilities from `src/lib/auth/roles.ts`
- Always lint code before committing with `npm run lint`
- API routes should implement proper authorization checks using role validation patterns
- Use organization-scoped data access patterns for multi-tenancy via RLS policies
- Server-only modules must use `'server-only'` imports for DocuSign SDK and sensitive integrations
- Use Supabase admin client (`src/utils/supabase/admin.ts`) for service role operations
- Follow resource-based API structure: `/api/[resource]/[id]/[action]` with role-based auth
- **DocuSign Integration**: Use template-based envelopes only (no HTML inline generation)
- **Organization Owner Lookup**: Use `getOrganizationOwner()` from `src/utils/organization/owner-lookup.ts`
- **Admin Dashboard**: Shows only "Sign DocuSign" button (no "Send DocuSign Agreement" button) - envelope creation is automatic
- **Signing URL Management**: Use `/api/docusign/signing-url` endpoint with automatic caching and regeneration
- Test with predefined role accounts for comprehensive coverage (see setup guides)

### Key Architectural Patterns
- **Multi-tenant RLS policies**: All data access is organization-scoped via Row Level Security
- **Server-only modules**: DocuSign SDK and sensitive integrations use `'server-only'` imports
- **Type-safe database operations**: Drizzle ORM with auto-generated types from schema
- **Modular auth protection**: Middleware + client-side + server-side role checks
- **Resource-based API structure**: `/api/[resource]/[id]/[action]` pattern with role-based auth
- **Template-based integrations**: DocuSign templates and email templates for consistent workflows
- **Three-stage DocuSign signing**: iPay Admin → Organization Owner → Borrower workflow with status tracking

### Testing Setup
Reference the setup guides for comprehensive testing:
- `docs/setup-guides/ROLE_SETUP_GUIDE.md` - Role-based access testing with predefined accounts
- `docs/setup-guides/STRIPE_SETUP.md` - Payment integration and identity verification testing
- `docs/setup-guides/DOCUSIGN_SETUP.md` - Document signing and template testing

**Note**: No formal testing framework is currently configured. Consider adding Jest/Vitest for unit tests and Playwright/Cypress for E2E testing.

### Test Data Management Commands
```bash
# Create test loan data for DocuSign testing
npm run test:create-loan

# Clean up all test data
npm run test:cleanup
```

### Common Development Patterns

#### API Route Structure
```typescript
// Pattern: Role validation + organization scoping + error handling
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user || !hasRequiredRole(user, 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Handle request with proper validation and error responses
}
```

#### Database Access Patterns
```typescript
// Use admin client for service role operations
import { supabaseAdmin } from '@/utils/supabase/admin';

// Use server client for user-scoped operations (RLS applies)
import { createClient } from '@/utils/supabase/server';
```

### Critical Configuration Notes

#### Next.js Configuration
- **DocuSign SDK exclusion**: The `next.config.ts` excludes DocuSign SDK from client-side bundling via webpack configuration and `serverExternalPackages`
- **Supabase image optimization**: Configured for Supabase storage bucket image serving
- **Server-only modules**: Use `'server-only'` imports for DocuSign and sensitive operations

#### DocuSign Three-Stage Signing Workflow
**Implementation Details:**
- **Template ID**: `8b9711f2-c304-4467-aa5c-27ebca4b4cc4` (iPay - Acuerdo de Financiamento Personal)
- **Signing Order**: Sequential routing with automatic progression
- **Status Tracking**: Real-time webhook updates via `/api/docusign/webhook`
- **Organization Owner Discovery**: Automatic lookup of organization's `organization_owner` role user

**Signing Flow:**
| Stage | Signer | Email | Role | Status After Signing |
|-------|--------|--------|------|---------------------|
| 1 | iPay Admin | `jhoamadrian@gmail.com` | iPay Representative | `ipay_approved` |
| 2 | Organization Owner | Dynamic lookup | Organization Representative | `dealer_approved` |
| 3 | Borrower | From application | Loan Applicant | `fully_signed` |

**Dashboard Button States:**
- **Admin Dashboard** (`/admin/loans/[id]`):
  - Status `application_completed` or `new`: **"✍️ Sign DocuSign (iPay Admin)"** button
  - Status `ipay_approved`: **"📄 Awaiting Organization Owner Signature"** (informational)
  - Status `dealer_approved`: **"📄 Awaiting Borrower Signature"** (informational)
  - Status `fully_signed`: **"✅ Fully Signed"** (informational)

- **Organization Dashboard** (`/dashboard/loans/[id]`):
  - Status `ipay_approved`: **"Sign DocuSign"** button
  - Other statuses: Informational displays

- **Signing URL Caching**: All signing URLs are cached for 24 hours in database with automatic regeneration

#### Database Schema Details
Key database relationships and constraints:
- **Multi-tenant isolation**: All tables include `organization_id` foreign keys with RLS policies
- **Loan lifecycle tracking**: Three-stage signing status progression with enum-based type safety
- **DocuSign signing URL caching**: Fields for caching signing URLs with timestamp tracking
  - `ipay_signing_url`: Cached URL for iPay admin signing
  - `organization_signing_url`: Cached URL for organization owner signing  
  - `borrower_signing_url`: Cached URL for borrower signing
  - `signing_urls_generated_at`: Timestamp for 24-hour cache invalidation
- **Payment scheduling**: Weekly payment schedules generated with precise decimal handling (`numeric` columns)
- **Verification workflows**: Separate Stripe identity and Twilio phone verification tracking
- **DocuSign integration**: Envelope ID and status tracking with timestamp audit trails

#### Role Hierarchy and Permissions
```typescript
// Role-based permission matrix (from src/lib/auth/roles.ts):
- admin: Cross-organization access, full system management (iPay super-admin)
- organization_owner: Organization-scoped with full team management
- user: Organization-scoped with team management capabilities  
- team_member: Organization-scoped, limited to loan/borrower operations
- borrower: Self-service access to own loan data only

// Current Admin User:
- jhoamadrian@gmail.com: iPay organization admin with cross-organization access
```

#### Webhook Security and Processing
- **Stripe webhooks**: Payment lifecycle, identity verification, and late fee processing
- **DocuSign webhooks**: Document signing status updates with JWT authentication
- **Signature verification**: All webhooks verify signatures before processing
- **Idempotency handling**: Prevents duplicate processing of webhook events

#### Environment Variables Security
**Critical**: Never commit actual values. Production requires:
- DocuSign RSA private key in proper format with escaped newlines
- Stripe webhook secrets for signature verification
- Supabase service role key for RLS bypass operations
- Proper CORS configuration for client-side Supabase operations

### Troubleshooting Common Issues

#### DocuSign Authentication
- Ensure RSA private key format includes proper `\n` escaping
- Verify user consent granted in DocuSign admin panel
- Check integration key and user ID match DocuSign developer account

#### Stripe Integration
- Webhook endpoint must be publicly accessible for testing
- Use Stripe CLI for local webhook forwarding: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

#### URL Configuration
- **Single Base URL**: `NEXT_PUBLIC_BASE_URL` handles all URL needs (auth, DocuSign callbacks, webhooks, redirects)
- **DocuSign URLs**: Separate API (`DOCUSIGN_BASE_PATH`) and web (`DOCUSIGN_WEB_URL`) endpoints for reliability  
- **Environment Switching**: Change one variable from `http://localhost:3000` to `https://your-domain.com` for production
- Verify API version compatibility (`2025-06-30.basil`)

#### Database Migrations
- Always generate migrations after schema changes: `npm run db:generate`
- Apply migrations before deployment: `npm run db:migrate`  
- Use `db:push` only for development prototyping

#### Multi-tenant Data Access
- RLS policies automatically scope data by organization
- Admin users bypass RLS constraints via service role client
- Test with different organization accounts to verify isolation

### Development Workflow
1. **Schema changes**: Update schema → `npm run db:generate` → `npm run db:migrate`
2. **API development**: Implement role checks → test with different user roles → verify organization scoping
3. **Integration testing**: Use webhook forwarding → test with Stripe/DocuSign test accounts
4. **Pre-deployment**: Run `npm run lint` → verify environment variables → test role-based access