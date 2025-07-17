# Production Deployment Checklist

This comprehensive checklist ensures a smooth transition from development to production for the iPayUS loan management application.

## Pre-Deployment Preparation

### Domain & Infrastructure
- [ ] **Domain purchased and configured**
  - [ ] DNS records pointed to hosting provider
  - [ ] SSL certificate installed and verified
  - [ ] HTTPS functioning correctly
  - [ ] CDN configured (if applicable)

- [ ] **Hosting Environment Setup**
  - [ ] Production hosting account created (Vercel, AWS, etc.)
  - [ ] Build and deployment pipeline configured
  - [ ] Environment variables configured
  - [ ] Database provisioned

### Code Preparation
- [ ] **Remove development-specific code**
  - [ ] Remove debug logs and console statements
  - [ ] Remove test API keys or hardcoded values
  - [ ] Verify no localhost references remain

- [ ] **Security Review**
  - [ ] All API keys use environment variables
  - [ ] No secrets committed to repository
  - [ ] CORS settings configured for production domain
  - [ ] Security headers implemented

---

## Environment Variables Configuration

### Core Application Settings
- [ ] `NEXT_PUBLIC_SITE_URL=https://your-production-domain.com`
- [ ] `NEXTAUTH_SECRET=[generate-strong-secret]`
- [ ] `NEXTAUTH_URL=https://your-production-domain.com`

### Database & Authentication (Supabase)
- [ ] `DATABASE_URL=[production-postgresql-url]`
- [ ] `NEXT_PUBLIC_SUPABASE_URL=https://[prod-project].supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY=[production-anon-key]`
- [ ] `SUPABASE_SERVICE_ROLE_KEY=[production-service-key]`

### Payment Processing (Stripe)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
- [ ] `STRIPE_SECRET_KEY=sk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_...`

### Document Signing (DocuSign)
- [ ] `DOCUSIGN_INTEGRATION_KEY=[production-key]`
- [ ] `DOCUSIGN_USER_ID=[production-user]`
- [ ] `DOCUSIGN_ACCOUNT_ID=[production-account]`
- [ ] `DOCUSIGN_PRIVATE_KEY=[production-rsa-key]`
- [ ] `DOCUSIGN_BASE_PATH=https://www.docusign.net/restapi`

### Communication Services
- [ ] `TWILIO_ACCOUNT_SID=[production-sid]`
- [ ] `TWILIO_AUTH_TOKEN=[production-token]`
- [ ] `TWILIO_VERIFY_SERVICE_SID=[production-service]`
- [ ] `RESEND_API_KEY=[production-key]`
- [ ] `EMAIL_SERVER_USER=[production-email]`
- [ ] `EMAIL_SERVER_PASSWORD=[production-password]`

---

## Third-Party Service Configuration

### Stripe Setup
- [ ] **Production account activated**
- [ ] **Webhook endpoint configured**:
  - URL: `https://your-domain.com/api/stripe/webhook`
  - Events: `invoice.*`, `identity.verification_session.*`
  - Secret copied to environment variables
- [ ] **API keys updated** (test → live)
- [ ] **Payment methods tested**
- [ ] **Identity verification enabled**

### DocuSign Setup
- [ ] **Production application created**
- [ ] **JWT authentication configured**
- [ ] **RSA key pair generated and configured**
- [ ] **Connect webhook configured**:
  - URL: `https://your-domain.com/api/docusign/webhook`
  - Events: All envelope events
- [ ] **Document templates imported**
- [ ] **Go-Live process completed**

### Twilio Setup
- [ ] **Production account verified**
- [ ] **Verify service created**
- [ ] **Webhook configured**:
  - URL: `https://your-domain.com/api/twilio/webhook`
  - Events: All verification events
- [ ] **Phone number verification tested**

### Supabase Setup
- [ ] **Production project created**
- [ ] **Database schema migrated**
- [ ] **Authentication configured**:
  - Site URL updated
  - Email templates configured
  - Redirect URLs updated
- [ ] **Storage buckets created**
- [ ] **RLS policies configured**
- [ ] **Backups enabled**

### Email Service Setup
- [ ] **Resend domain verified** (if using custom domain)
- [ ] **SMTP credentials configured** (fallback)
- [ ] **Email templates tested**
- [ ] **SPF/DKIM records configured**

---

## Database Migration

### Schema Migration
- [ ] **Export development schema**
  ```bash
  pg_dump "dev-connection" --schema-only > schema.sql
  ```
- [ ] **Apply to production**
  ```bash
  psql "prod-connection" < schema.sql
  ```
- [ ] **Run migrations**
  ```bash
  npm run db:migrate
  ```

### Data Migration
- [ ] **Export essential data**:
  - [ ] Organizations
  - [ ] Initial admin users
  - [ ] System settings
- [ ] **Import to production database**
- [ ] **Verify data integrity**
- [ ] **Test data access with RLS policies**

### Storage Migration
- [ ] **Create storage buckets**
- [ ] **Configure CORS settings**
- [ ] **Set bucket policies**
- [ ] **Test file upload/download**

---

## Application Deployment

### Build & Deploy
- [ ] **Build application locally**
  ```bash
  npm run build
  ```
- [ ] **Fix any build errors**
- [ ] **Deploy to production environment**
- [ ] **Verify deployment successful**

### Domain Configuration
- [ ] **Update DNS records** (if needed)
- [ ] **Configure SSL certificate**
- [ ] **Set up redirects** (www → non-www, etc.)
- [ ] **Test domain accessibility**

---

## Testing & Verification

### Application Flow Testing
- [ ] **User Registration**:
  - [ ] Sign up with email
  - [ ] Email verification works
  - [ ] Profile creation successful

- [ ] **Loan Application Process**:
  - [ ] Organization user can create applications
  - [ ] Email invitations sent successfully
  - [ ] Customer application flow works
  - [ ] Stripe identity verification functions
  - [ ] Phone verification via Twilio works
  - [ ] DocuSign document signing complete

- [ ] **Payment Processing**:
  - [ ] Payment method setup works
  - [ ] Payment schedules generated
  - [ ] Payment processing functions
  - [ ] Webhook events handled correctly

### API Endpoint Testing
- [ ] **Webhook endpoints respond correctly**:
  - [ ] `/api/stripe/webhook` (200 for valid, 400 for invalid)
  - [ ] `/api/docusign/webhook` (200 response)
  - [ ] `/api/twilio/webhook` (200 response)

- [ ] **Core API endpoints functional**:
  - [ ] Authentication endpoints
  - [ ] Loan CRUD operations
  - [ ] File upload endpoints
  - [ ] Email sending endpoints

### Integration Testing
- [ ] **Stripe Integration**:
  - [ ] Payment intent creation
  - [ ] Identity verification sessions
  - [ ] Webhook event processing
  - [ ] Subscription management

- [ ] **DocuSign Integration**:
  - [ ] Envelope creation and sending
  - [ ] Document template loading
  - [ ] Status update processing
  - [ ] JWT authentication

- [ ] **Twilio Integration**:
  - [ ] SMS verification sending
  - [ ] Code verification
  - [ ] Webhook status updates

- [ ] **Email Integration**:
  - [ ] Application invitations
  - [ ] Logo images display correctly
  - [ ] Links work properly

---

## Performance & Security

### Performance Testing
- [ ] **Load testing completed**
- [ ] **Database query performance verified**
- [ ] **CDN configuration optimized**
- [ ] **Image optimization confirmed**

### Security Verification
- [ ] **HTTPS enforced**
- [ ] **Security headers implemented**
- [ ] **API rate limiting configured**
- [ ] **Webhook signature verification working**
- [ ] **Database access properly secured**

---

## Monitoring & Alerting

### Application Monitoring
- [ ] **Error tracking configured** (Sentry, etc.)
- [ ] **Performance monitoring setup**
- [ ] **Uptime monitoring configured**
- [ ] **Log aggregation setup**

### Business Metrics
- [ ] **Conversion tracking setup**
- [ ] **User engagement metrics**
- [ ] **Payment success rate monitoring**
- [ ] **Application completion rate tracking**

### Alert Configuration
- [ ] **Application error alerts**
- [ ] **Webhook failure alerts**
- [ ] **Database performance alerts**
- [ ] **Third-party service outage alerts**

---

## Documentation & Training

### Documentation Updates
- [ ] **Update README with production URLs**
- [ ] **Update API documentation**
- [ ] **Create deployment runbook**
- [ ] **Document rollback procedures**

### Team Training
- [ ] **Production access configured for team**
- [ ] **Monitoring dashboard training**
- [ ] **Incident response procedures documented**
- [ ] **Support contact information updated**

---

## Post-Launch Checklist

### Immediate (0-24 hours)
- [ ] **Monitor application logs for errors**
- [ ] **Verify webhook delivery success rates**
- [ ] **Check database performance metrics**
- [ ] **Test critical user flows**
- [ ] **Monitor payment processing**

### Short-term (1-7 days)
- [ ] **Review error rates and fix issues**
- [ ] **Monitor email delivery rates**
- [ ] **Check DocuSign completion rates**
- [ ] **Gather user feedback**
- [ ] **Performance optimization**

### Long-term (1-4 weeks)
- [ ] **Analyze usage patterns**
- [ ] **Review security logs**
- [ ] **Optimize database queries**
- [ ] **Plan feature enhancements**

---

## Emergency Procedures

### Rollback Plan
- [ ] **Previous version deployment ready**
- [ ] **Database rollback scripts prepared**
- [ ] **Third-party service rollback procedures documented**
- [ ] **DNS rollback plan documented**

### Emergency Contacts
- [ ] **Development team contacts updated**
- [ ] **Service provider support contacts ready**
- [ ] **Hosting provider support information**
- [ ] **Domain registrar contact information**

---

## Sign-Off Checklist

### Technical Sign-Off
- [ ] **Lead Developer approval**
- [ ] **QA team approval**
- [ ] **DevOps team approval**

### Business Sign-Off
- [ ] **Product owner approval**
- [ ] **Stakeholder approval**
- [ ] **Go-live date confirmed**

### Final Verification
- [ ] **All checklist items completed**
- [ ] **Backup and recovery tested**
- [ ] **Monitoring confirmed functional**
- [ ] **Support team briefed**

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Approved By**: _______________

*Last Updated: [Current Date]*
*Version: 1.0*