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
- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Supabase Authentication
- **UI**: Tailwind CSS
- **Payments**: Stripe integration
- **Document Signing**: DocuSign integration
- **Email**: Resend/Nodemailer

### Core Database Schema
The application uses a multi-tenant architecture with the following key entities:

- **organizations** - Financial institutions/dealerships
- **profiles** - User accounts linked to auth.users, with role-based access
- **borrowers** - Loan applicants with KYC information
- **loans** - Loan applications with vehicle details and DocuSign integration
- **payment_schedules** - Generated payment schedules for loans
- **payments** - Payment records with Stripe integration

### Role-Based Access Control
Three primary roles defined in `src/lib/auth/roles.ts`:

1. **admin**: Full system access across all organizations
2. **user**: Dealership staff limited to their organization
3. **borrower**: Customers with read-only access to their loan information

**Route Protection**:
- `/admin/*` - Admin only
- `/dashboard/*` - Admin and user roles
- `/borrower/*` - Borrower role only
- `/apply/*`, `/payment-*` - Public routes

### Key Integration Points

#### DocuSign Integration
- JWT authentication configured in `src/utils/docusign/`
- Webhook handling at `/api/docusign/webhook`
- Templates and envelope management
- Status tracking in loans table

#### Stripe Integration
- Payment method setup and verification
- Subscription-based recurring payments
- Webhook handling at `/api/stripe/webhook`
- Identity verification sessions

#### Supabase Integration
- Authentication and user management
- RLS policies for data isolation
- Client/server utilities in `src/utils/supabase/`

### Application Flow
1. **Loan Application**: Borrowers apply via `/apply/[loanId]`
2. **Admin Review**: Staff review applications in `/dashboard/loans`
3. **Document Signing**: DocuSign integration for loan agreements
4. **Payment Setup**: Stripe integration for payment collection
5. **Payment Management**: Automated payment schedules and tracking

### File Structure Conventions
- **API Routes**: `/src/app/api/` - Server-side endpoints
- **Components**: `/src/components/` - Reusable UI components
- **Database**: `/src/drizzle/` - Schema and migrations
- **Utils**: `/src/utils/` - Third-party integrations and helpers
- **Auth**: `/src/lib/auth/` - Role-based access control

### Environment Variables Required
```bash
# Database
DATABASE_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# DocuSign
DOCUSIGN_INTEGRATION_KEY=
DOCUSIGN_USER_ID=
DOCUSIGN_PRIVATE_KEY=
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi

# Email
RESEND_API_KEY=
```

### Development Guidelines
- Database schema changes require migration via `npm run db:generate`
- Role-based access should use utilities from `/src/lib/auth/roles.ts`
- Always lint code before committing with `npm run lint`
- API routes should implement proper authorization checks
- Use organization-scoped data access patterns for multi-tenancy

### Testing Setup
Reference the setup guides for comprehensive testing:
- `ROLE_SETUP_GUIDE.md` - Role-based access testing
- `STRIPE_SETUP.md` - Payment integration testing
- `DOCUSIGN_SETUP.md` - Document signing testing