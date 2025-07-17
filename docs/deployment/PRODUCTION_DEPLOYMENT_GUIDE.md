# Production Deployment Guide

This guide provides comprehensive instructions for deploying the iPayUS loan management application to production, including domain migration, environment configuration, and third-party service setup.

## Table of Contents

1. [Environment Variables Configuration](#environment-variables-configuration)
2. [Domain Migration Checklist](#domain-migration-checklist)
3. [Third-Party Service Configuration](#third-party-service-configuration)
4. [Database Migration](#database-migration)
5. [Testing & Verification](#testing--verification)
6. [Rollback Procedures](#rollback-procedures)

---

## Environment Variables Configuration

### Required Environment Variables

```bash
# Core Application Settings
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-production-jwt-secret-key
NEXTAUTH_URL=https://your-production-domain.com

# Database & Authentication (Supabase)
DATABASE_URL=postgresql://postgres:password@your-production-db-host:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Payment Processing (Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_production_secret_from_stripe_dashboard

# Document Signing (DocuSign)
DOCUSIGN_INTEGRATION_KEY=your-production-integration-key
DOCUSIGN_USER_ID=your-production-user-id
DOCUSIGN_ACCOUNT_ID=your-production-account-id
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYourProductionPrivateKey\n-----END RSA PRIVATE KEY-----"
DOCUSIGN_BASE_PATH=https://www.docusign.net/restapi

# Phone Verification (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-production-auth-token
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Email Services
RESEND_API_KEY=re_production_api_key
EMAIL_SERVER_USER=your-smtp-email@domain.com
EMAIL_SERVER_PASSWORD=your-smtp-password
```

### Environment Variable Differences by Environment

| Variable | Development | Production |
|----------|-------------|------------|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://your-domain.com` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `DOCUSIGN_BASE_PATH` | `https://demo.docusign.net/restapi` | `https://www.docusign.net/restapi` |
| Database | Local/Dev Supabase | Production Supabase |

---

## Domain Migration Checklist

### Pre-Migration Steps

- [ ] **Domain Setup**
  - [ ] Domain purchased and DNS configured
  - [ ] SSL certificate installed and verified
  - [ ] HTTPS functioning correctly

- [ ] **Environment Preparation**
  - [ ] Production environment created (Vercel, AWS, etc.)
  - [ ] Environment variables configured
  - [ ] Build and deployment pipeline tested

### Files Requiring Updates

#### 1. **Remove Hardcoded URLs**
- [ ] Update `/STRIPE_WEBHOOK_CONFIGURATION.md`
  - Change `https://paysolutions.vercel.app` to `https://your-domain.com`
- [ ] Update `/.env.local` or production environment
  - Set `NEXT_PUBLIC_SITE_URL=https://your-domain.com`

#### 2. **Verify Dynamic URL Usage**
These files correctly use environment variables (no changes needed):
- ✅ `/src/components/emails/LoanApplicationTemplate.tsx`
- ✅ `/src/app/api/docusign/connect/route.ts`
- ✅ `/src/app/api/loans/send-application/route.ts`
- ✅ All other API routes using `NEXT_PUBLIC_SITE_URL`

### Post-Migration Verification

- [ ] **URL Resolution Test**
  - [ ] Email templates load correct logo URLs
  - [ ] Application links work correctly
  - [ ] Admin panel redirects function properly

---

## Third-Party Service Configuration

### 1. Stripe Configuration

#### A. Dashboard Configuration
1. **Access Stripe Dashboard** → Developers → Webhooks
2. **Update Webhook Endpoint**:
   - Old: `https://paysolutions.vercel.app/api/stripe/webhook`
   - New: `https://your-domain.com/api/stripe/webhook`
3. **Generate New Webhook Secret**:
   - Copy the `whsec_...` secret
   - Update `STRIPE_WEBHOOK_SECRET` environment variable

#### B. Required Stripe Events
Ensure these events are enabled in your webhook:
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `invoice.sent`
- `invoice.overdue`
- `identity.verification_session.verified`
- `identity.verification_session.requires_input`
- `identity.verification_session.processing`
- `identity.verification_session.canceled`

#### C. API Keys
- **Test → Production**:
  - `pk_test_...` → `pk_live_...`
  - `sk_test_...` → `sk_live_...`

### 2. DocuSign Configuration

#### A. Environment Switch
- **Demo → Production**:
  - `DOCUSIGN_BASE_PATH`: `https://demo.docusign.net/restapi` → `https://www.docusign.net/restapi`
  - New integration key and credentials for production account

#### B. Connect Webhook Setup
1. **Access DocuSign Admin Console** → Connect
2. **Create New Connection**:
   - Name: "iPayUS Production"
   - URL: `https://your-domain.com/api/docusign/webhook`
   - Events: envelope-sent, envelope-delivered, envelope-completed, etc.
3. **Test Connection** before going live

#### C. JWT Application
- Create production JWT application in DocuSign
- Generate new RSA key pair for production
- Update integration key and private key

### 3. Twilio Configuration

#### A. Verify Service Setup
1. **Access Twilio Console** → Verify → Services
2. **Update Webhook URL**:
   - Status callback URL: `https://your-domain.com/api/twilio/webhook`
   - Include events: `pending`, `approved`, `expired`, `canceled`, `max-attempts-reached`

#### B. Account Credentials
- Production account SID and auth token
- New Verify service SID for production

### 4. Supabase Configuration

#### A. Production Project Setup
1. **Create Production Project**
2. **Configure Authentication**:
   - Email templates
   - Redirect URLs: `https://your-domain.com/auth/callback`
3. **Row Level Security** policies
4. **Storage buckets** for organization logos

#### B. Database Migration
- Export schema from development
- Apply migrations to production
- Import initial data if needed

---

## Database Migration

### Migration Steps

1. **Schema Migration**
   ```bash
   # Generate migration files
   npm run db:generate
   
   # Apply to production
   npm run db:migrate
   ```

2. **Data Migration**
   - Export essential data (organizations, initial users)
   - Import to production database
   - Verify data integrity

3. **Storage Setup**
   - Configure Supabase storage buckets
   - Set appropriate permissions
   - Test file upload functionality

---

## Testing & Verification

### Pre-Launch Testing

#### 1. **Application Flow Testing**
- [ ] **User Registration** and email verification
- [ ] **Loan Application** creation and email sending
- [ ] **Customer Application** completion process
- [ ] **DocuSign** document signing flow
- [ ] **Stripe Identity** verification
- [ ] **Payment Setup** and processing

#### 2. **Webhook Testing**
- [ ] **Stripe Webhooks**:
  ```bash
  # Test webhook using Stripe CLI
  stripe listen --forward-to https://your-domain.com/api/stripe/webhook
  ```
- [ ] **DocuSign Webhooks**: Send test envelope and verify status updates
- [ ] **Twilio Webhooks**: Test phone verification flow

#### 3. **Email Testing**
- [ ] **Application Invitations** sent correctly
- [ ] **Logo Images** display properly
- [ ] **Links** redirect to correct domain

#### 4. **Integration Testing**
- [ ] **API Endpoints** respond correctly
- [ ] **Authentication** works properly
- [ ] **File Uploads** function correctly
- [ ] **Payment Processing** works end-to-end

### Performance Testing

- [ ] **Load Testing**: Verify application handles expected traffic
- [ ] **Database Performance**: Check query performance under load
- [ ] **CDN Configuration**: Ensure static assets load quickly

---

## Rollback Procedures

### Emergency Rollback Plan

#### 1. **Application Rollback**
```bash
# If using Vercel
vercel rollback [deployment-url]

# If using custom deployment
git revert [commit-hash]
# Redeploy previous version
```

#### 2. **Database Rollback**
```bash
# Revert migrations if needed
npm run db:rollback [migration-number]
```

#### 3. **Third-Party Services**
- **Stripe**: Revert webhook URLs to previous domain
- **DocuSign**: Disable new Connect configuration
- **Twilio**: Revert webhook URLs

### Monitoring & Alerts

- [ ] **Application Monitoring** setup (error tracking)
- [ ] **Database Monitoring** (query performance, connections)
- [ ] **Third-Party Service** status monitoring
- [ ] **Webhook Failure** alerts configured

---

## Post-Launch Checklist

### Immediate (0-24 hours)
- [ ] Monitor application logs for errors
- [ ] Verify webhook delivery success rates
- [ ] Check database performance metrics
- [ ] Test critical user flows

### Short-term (1-7 days)
- [ ] Monitor payment processing success rates
- [ ] Verify email delivery rates
- [ ] Check DocuSign completion rates
- [ ] Review user feedback and issues

### Long-term (1-4 weeks)
- [ ] Analyze application performance trends
- [ ] Review security logs
- [ ] Update documentation with lessons learned
- [ ] Plan performance optimizations if needed

---

## Support Contacts

### Development Team
- **Primary Contact**: [Developer Name/Email]
- **Emergency Contact**: [24/7 Contact Info]

### Service Providers
- **Stripe Support**: [Account contact info]
- **DocuSign Support**: [Account contact info]
- **Twilio Support**: [Account contact info]
- **Supabase Support**: [Support channel]

---

## Additional Resources

- [Stripe Production Checklist](https://stripe.com/docs/payments/checkout/fulfill-orders)
- [DocuSign Go-Live Process](https://developers.docusign.com/platform/go-live/)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)

---

*Last Updated: [Current Date]*
*Version: 1.0*