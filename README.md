# iPayUS Loan Management System

A comprehensive Next.js 15 loan management application with multi-tenant, role-based architecture for financial institutions.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp env.template .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technology Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Supabase Authentication
- **UI**: Tailwind CSS 4 with Framer Motion
- **Payments**: Stripe integration
- **Document Signing**: DocuSign integration
- **Communication**: Twilio (phone verification), Resend/Nodemailer (email)

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Lint code
npm run format       # Format code

# Database
npm run db:generate  # Generate database migrations
npm run db:migrate   # Apply migrations to database
npm run db:push      # Push schema changes directly
npm run db:studio    # Open Drizzle Studio
```

## Project Structure

```
├── docs/                          # Documentation
│   ├── setup-guides/             # Service setup guides
│   │   ├── DOCUSIGN_SETUP.md
│   │   ├── STRIPE_SETUP.md
│   │   ├── TWILIO_SETUP.md
│   │   └── ROLE_SETUP_GUIDE.md
│   ├── deployment/               # Production deployment guides
│   │   ├── API_TRANSITION_GUIDE.md
│   │   ├── DEPLOYMENT_CHECKLIST.md
│   │   ├── PRODUCTION_DEPLOYMENT_GUIDE.md
│   │   ├── HANDOFF_SUMMARY.md
│   │   └── STRIPE_WEBHOOK_CONFIGURATION.md
│   └── email-templates/          # Email template documentation
├── scripts/                      # Database and setup scripts
│   ├── migrations/              # Database migration files
│   └── setup/                   # Initial setup scripts
├── src/
│   ├── app/                     # Next.js app directory
│   ├── components/              # Reusable React components
│   ├── lib/                     # Utility libraries
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Helper utilities
└── CLAUDE.md                    # Claude Code instructions
```

## Role-Based Access Control

- **admin**: Full system access across all organizations
- **organization_owner**: Full access within their organization + team management
- **user**: Dealership staff with organization-scoped access + team management
- **team_member**: Limited organization-scoped access (no team management)
- **borrower**: Read-only access to their own loan information

## Quick Setup Guides

### For Development
1. Follow the setup guides in `/docs/setup-guides/`
2. Run database migrations: `npm run db:migrate`
3. Set up test accounts: Use scripts in `/scripts/setup/`

### For Production Deployment
1. Review `/docs/deployment/DEPLOYMENT_CHECKLIST.md`
2. Follow `/docs/deployment/PRODUCTION_DEPLOYMENT_GUIDE.md`
3. Configure APIs using `/docs/deployment/API_TRANSITION_GUIDE.md`

## Key Features

- **Multi-tenant Architecture**: Organization isolation with RLS policies
- **Loan Origination**: Public application flow with KYC verification
- **Document Signing**: DocuSign integration with template management
- **Payment Processing**: Stripe integration with recurring schedules
- **Identity Verification**: Stripe Identity + Twilio phone verification
- **Role Management**: Comprehensive permission system

## Environment Setup

Copy `env.template` to `.env.local` and configure:

- **Database**: Supabase PostgreSQL connection
- **Authentication**: Supabase auth keys
- **Payments**: Stripe API keys (test/live)
- **Documents**: DocuSign integration keys
- **Communication**: Twilio and email service credentials

## Support

- **Setup Issues**: See guides in `/docs/setup-guides/`
- **Deployment**: See guides in `/docs/deployment/`
- **API Documentation**: Check individual API route files
- **Database Schema**: Review `/src/drizzle/schema/`

## License

Private project - All rights reserved.