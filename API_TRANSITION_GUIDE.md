# API Transition Guide: Test to Production

This document provides detailed instructions for transitioning all API integrations from test/development environments to production.

## Overview

The iPayUS application integrates with 5 primary external APIs that require configuration changes when moving to production:

1. **Stripe** (Payment Processing)
2. **DocuSign** (Document Signing)
3. **Twilio** (SMS Verification)
4. **Supabase** (Database & Authentication)
5. **Resend/SMTP** (Email Services)

---

## 1. Stripe API Transition

### Current Test Configuration
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

### Production Migration Steps

#### Step 1: Stripe Dashboard Configuration
1. **Access Stripe Dashboard** (production account)
2. **Navigate to**: Developers → API Keys
3. **Copy Production Keys**:
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`

#### Step 2: Webhook Configuration
1. **Navigate to**: Developers → Webhooks
2. **Create Webhook Endpoint**:
   - URL: `https://your-production-domain.com/api/stripe/webhook`
   - Events to select:
     ```
     invoice.payment_succeeded
     invoice.payment_failed
     invoice.sent
     invoice.overdue
     identity.verification_session.verified
     identity.verification_session.requires_input
     identity.verification_session.processing
     identity.verification_session.canceled
     ```
3. **Copy Webhook Secret**: `whsec_...`

#### Step 3: Update Environment Variables
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[your_production_key]
STRIPE_SECRET_KEY=sk_live_[your_production_key]
STRIPE_WEBHOOK_SECRET=whsec_[your_production_secret]
```

#### Step 4: Test Production Integration
```bash
# Test webhook endpoint
curl -X POST https://your-domain.com/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Important Notes
- **API Version**: Application uses `2025-06-30.basil` (hardcoded in webhook handler)
- **Payment Flow**: Recurring subscriptions for loan payments
- **Identity Verification**: Stripe Identity used for borrower KYC

---

## 2. DocuSign API Transition

### Current Test Configuration
```bash
DOCUSIGN_INTEGRATION_KEY=your-test-integration-key
DOCUSIGN_USER_ID=your-test-user-id
DOCUSIGN_ACCOUNT_ID=your-test-account-id
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
```

### Production Migration Steps

#### Step 1: Create Production Application
1. **Access DocuSign Admin Console** (production account)
2. **Navigate to**: Settings → API and Keys → Apps and Keys
3. **Create New App**:
   - App Name: "iPayUS Production"
   - Select: "Authorization Code Grant" and "JWT Grant"
4. **Generate RSA Key Pair**:
   - Download private key
   - Copy public key to DocuSign

#### Step 2: JWT Configuration
1. **Generate Integration Key**: Copy from app settings
2. **Get User ID**: From DocuSign user profile
3. **Get Account ID**: From organization settings
4. **Configure JWT Grant**: Authorize application

#### Step 3: Connect Webhook Setup
1. **Access**: Settings → Connect
2. **Create Configuration**:
   - Name: "iPayUS Production"
   - URL: `https://your-production-domain.com/api/docusign/webhook`
   - Events: Select all envelope events
3. **Test Connection**: Send test events

#### Step 4: Update Environment Variables
```bash
DOCUSIGN_INTEGRATION_KEY=[production-integration-key]
DOCUSIGN_USER_ID=[production-user-id]
DOCUSIGN_ACCOUNT_ID=[production-account-id]
DOCUSIGN_BASE_PATH=https://www.docusign.net/restapi
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
[Your production private key content]
-----END RSA PRIVATE KEY-----"
```

### Important Notes
- **Authentication**: Uses JWT authentication with RSA keys
- **Webhook Security**: Basic validation (consider enhancing)
- **Templates**: Ensure loan templates are configured in production account

---

## 3. Twilio API Transition

### Current Test Configuration
```bash
TWILIO_ACCOUNT_SID=ACtest...
TWILIO_AUTH_TOKEN=test-auth-token
TWILIO_VERIFY_SERVICE_SID=VAtest...
```

### Production Migration Steps

#### Step 1: Create Production Verify Service
1. **Access Twilio Console** (production account)
2. **Navigate to**: Verify → Services
3. **Create Service**:
   - Service Name: "iPayUS Phone Verification"
   - Code Length: 6 digits
   - Code Expiry: 5 minutes

#### Step 2: Configure Webhooks
1. **In Verify Service Settings**:
   - Status Callback URL: `https://your-production-domain.com/api/twilio/webhook`
   - Events: Select all verification events
2. **Test Webhook**: Send test verification

#### Step 3: Update Environment Variables
```bash
TWILIO_ACCOUNT_SID=[production-account-sid]
TWILIO_AUTH_TOKEN=[production-auth-token]
TWILIO_VERIFY_SERVICE_SID=[production-verify-service-sid]
```

#### Step 4: Test Integration
```bash
# Test phone verification endpoint
curl -X POST https://your-domain.com/api/twilio/send-verification \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+1234567890"}'
```

### Important Notes
- **Webhook Security**: HMAC-SHA1 signature verification implemented
- **Rate Limiting**: Twilio has rate limits for verification requests
- **International Numbers**: Ensure international SMS is enabled if needed

---

## 4. Supabase Transition

### Current Test Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Production Migration Steps

#### Step 1: Create Production Project
1. **Access Supabase Dashboard**
2. **Create New Project**:
   - Organization: Select your organization
   - Name: "iPayUS Production"
   - Database Password: Strong password
   - Region: Choose closest to users

#### Step 2: Database Schema Migration
```bash
# Export schema from development
pg_dump "development-connection-string" --schema-only > schema.sql

# Apply to production
psql "production-connection-string" < schema.sql

# Or use Supabase CLI
supabase db push --project-ref [production-project-ref]
```

#### Step 3: Configure Authentication
1. **Navigate to**: Authentication → Settings
2. **Configure**:
   - Site URL: `https://your-production-domain.com`
   - Redirect URLs: `https://your-production-domain.com/auth/callback`
3. **Email Templates**: Update with production branding

#### Step 4: Storage Configuration
1. **Create Buckets**: organization-logos, documents
2. **Set Policies**: Configure RLS policies
3. **CORS Settings**: Allow your production domain

#### Step 5: Update Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[production-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[production-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[production-service-role-key]
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
```

### Important Notes
- **RLS Policies**: Ensure Row Level Security policies are properly configured
- **Database Performance**: Monitor connection pooling and query performance
- **Backups**: Configure automated backups

---

## 5. Email Service Transition

### Current Test Configuration
```bash
RESEND_API_KEY=re_test_...
EMAIL_SERVER_USER=test@gmail.com
EMAIL_SERVER_PASSWORD=test-password
```

### Production Migration Steps

#### Step 1: Resend Configuration (Primary)
1. **Access Resend Dashboard**
2. **Create Production API Key**
3. **Configure Domain**: Add your production domain
4. **Verify Domain**: Complete DNS verification

#### Step 2: SMTP Fallback Configuration
1. **Configure Production SMTP**:
   - Use production email account
   - Generate app-specific password
   - Update credentials

#### Step 3: Update Environment Variables
```bash
RESEND_API_KEY=re_[production-api-key]
EMAIL_SERVER_USER=[production-email@your-domain.com]
EMAIL_SERVER_PASSWORD=[production-email-password]
```

#### Step 4: Test Email Delivery
```bash
# Test application invitation email
curl -X POST https://your-domain.com/api/loans/send-application \
  -H "Content-Type: application/json" \
  -d '{"customerEmail": "test@example.com", ...}'
```

---

## API Testing Checklist

### Pre-Production Testing

#### Stripe Testing
- [ ] Payment method setup works
- [ ] Identity verification sessions create successfully
- [ ] Webhook events are received and processed
- [ ] Invoice creation and payment processing works

#### DocuSign Testing
- [ ] JWT authentication successful
- [ ] Envelope creation and sending works
- [ ] Document templates load correctly
- [ ] Webhook events are received

#### Twilio Testing
- [ ] SMS verification codes are sent
- [ ] Verification codes are validated correctly
- [ ] Webhook events are received

#### Supabase Testing
- [ ] Database connections work
- [ ] Authentication flows function
- [ ] File uploads to storage work
- [ ] RLS policies enforce correctly

#### Email Testing
- [ ] Application invitation emails are sent
- [ ] Email templates render correctly
- [ ] Images and links work properly

### Production Validation

#### End-to-End Flow Testing
1. **Loan Application Creation**:
   - Create loan application
   - Verify email is sent to customer
   - Complete customer application
   - Test identity verification
   - Complete document signing
   - Setup payment method

2. **Payment Processing**:
   - Create test payment schedule
   - Process test payment
   - Verify webhook handling

3. **System Integration**:
   - Test all API endpoints
   - Verify database updates
   - Check notification systems

---

## Monitoring & Maintenance

### API Health Monitoring

#### Recommended Monitoring
- **Response Times**: Track API response times
- **Error Rates**: Monitor 4xx/5xx responses
- **Webhook Delivery**: Track webhook success rates
- **Database Performance**: Monitor query performance

#### Alert Configuration
- API endpoint failures
- Webhook delivery failures
- Database connection issues
- Third-party service outages

### Regular Maintenance

#### Monthly Reviews
- [ ] Review API usage and costs
- [ ] Check webhook delivery rates
- [ ] Monitor error logs
- [ ] Update API versions if needed

#### Quarterly Reviews
- [ ] Security audit of API keys
- [ ] Performance optimization review
- [ ] Backup and disaster recovery testing
- [ ] Documentation updates

---

## Troubleshooting Guide

### Common Issues

#### Stripe Issues
- **Webhook Verification Fails**: Check webhook secret
- **Payment Failures**: Verify card processing settings
- **Identity Verification Issues**: Check Stripe Identity configuration

#### DocuSign Issues
- **JWT Authentication Fails**: Verify RSA key configuration
- **Webhook Not Received**: Check Connect configuration
- **Template Issues**: Ensure templates exist in production account

#### Twilio Issues
- **SMS Not Delivered**: Check phone number format and service configuration
- **Webhook Verification Fails**: Verify auth token and signature calculation

#### Supabase Issues
- **Connection Failures**: Check connection string and firewall settings
- **RLS Policy Issues**: Verify policies are correctly configured
- **Storage Issues**: Check bucket policies and CORS settings

### Emergency Contacts

- **Stripe Support**: [Support channel info]
- **DocuSign Support**: [Support channel info]
- **Twilio Support**: [Support channel info]
- **Supabase Support**: [Support channel info]

---

*Last Updated: [Current Date]*
*Version: 1.0*