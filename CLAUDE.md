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

- **organizations** - Financial institutions/dealerships with subscription management
- **profiles** - User accounts linked to auth.users, with role-based access
- **borrowers** - Loan applicants with KYC information and references
- **loans** - Loan applications with vehicle details and DocuSign integration
- **payment_schedules** - Generated weekly payment schedules
- **payments** - Payment records with Stripe integration
- **organization_settings** - Configurable organization-specific settings

### Role-Based Access Control
Five roles defined in `src/lib/auth/roles.ts`:

1. **admin**: Full system access across all organizations
2. **organization_owner**: Full access within their organization + team management
3. **user**: Dealership staff with organization-scoped access + team management
4. **team_member**: Limited organization-scoped access (no team management)
5. **borrower**: Read-only access to their own loan information

**Route Protection**:
- `/admin/*` - Admin only
- `/dashboard/*` - Admin, organization_owner, user, team_member roles
- `/borrower/*` - Borrower role only
- `/apply/*`, `/payment-*` - Public routes

### Key Integration Points

#### DocuSign Integration
- JWT authentication with RSA key pairs in `src/utils/docusign/`
- Template-based document generation and envelope management
- Webhook handling at `/api/docusign/webhook` for status updates
- Status tracking and audit trails in loans table

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
2. **Staff Review**: Multi-role dashboard access for loan processing
3. **Identity Verification**: Stripe identity + Twilio phone verification
4. **Document Signing**: DocuSign template-based loan agreements
5. **Payment Collection**: Automated Stripe recurring payments with schedules
6. **Multi-Tenant Management**: Organization isolation and team collaboration

### File Structure Conventions
- **API Routes**: `/src/app/api/` - Server-side endpoints with role-based auth
- **Components**: `/src/components/` - Reusable UI with role-based rendering
- **Database**: `/src/drizzle/` - Schema, migrations, and type-safe queries
- **Utils**: `/src/utils/` - Third-party integrations (DocuSign, Stripe, Twilio)
- **Auth**: `/src/lib/auth/` - Role-based access control and middleware
- **Server-only**: Server-only modules for secure integrations

### Environment Variables Required
Copy `env.template` to `.env.local` and configure the required variables:

```bash
# Core Database & Auth
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Payment Processing
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=

# Document Signing (DocuSign)
DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_USER_ID=
DOCUSIGN_ACCOUNT_ID=
DOCUSIGN_PRIVATE_KEY=
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi

# Communication
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=

# Application
NEXT_PUBLIC_SITE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
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
- Test with predefined role accounts for comprehensive coverage (see setup guides)

### Key Architectural Patterns
- **Multi-tenant RLS policies**: All data access is organization-scoped via Row Level Security
- **Server-only modules**: DocuSign SDK and sensitive integrations use `'server-only'` imports
- **Type-safe database operations**: Drizzle ORM with auto-generated types from schema
- **Modular auth protection**: Middleware + client-side + server-side role checks
- **Resource-based API structure**: `/api/[resource]/[id]/[action]` pattern with role-based auth
- **Template-based integrations**: DocuSign templates and email templates for consistent workflows

### Testing Setup
Reference the setup guides for comprehensive testing:
- `docs/setup-guides/ROLE_SETUP_GUIDE.md` - Role-based access testing with predefined accounts
- `docs/setup-guides/STRIPE_SETUP.md` - Payment integration and identity verification testing
- `docs/setup-guides/DOCUSIGN_SETUP.md` - Document signing and template testing

**Note**: No formal testing framework is currently configured. Consider adding Jest/Vitest for unit tests and Playwright/Cypress for E2E testing.

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