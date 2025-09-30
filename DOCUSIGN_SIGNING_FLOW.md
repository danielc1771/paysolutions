# DocuSign Multi-Signer Flow

## Overview

Your loan application uses a **sequential signing process** with 3 signers in a specific order. This document explains how the signing flow works.

## Signing Order

```
1. iPay (jhoamadrian@gmail.com) - EMAIL
   ↓
2. Borrower (from application) - EMAIL
   ↓
3. Organization (jgarcia@easycarus.com) - EMAIL
```

**All signers receive email notifications in sequential order. No embedded signing is used.**

## How It Works

### Step 1: Envelope Creation
When a borrower completes their loan application, the system creates a DocuSign envelope with all three signers:

```typescript
POST /api/docusign/create-envelope
{
  "loanId": "uuid-of-loan"
}
```

**What happens:**
1. System fetches loan data from Supabase
2. Creates envelope with 3 template roles:
   - **iPay** (Routing Order 1) - Will receive email first
   - **Borrower** (Routing Order 2) - Will receive email after iPay signs
   - **Organization** (Routing Order 3) - Will receive email after Borrower signs
3. Pre-fills borrower information in the document
4. Sends envelope - iPay receives immediate email notification

**Response:**
```json
{
  "success": true,
  "envelopeId": "envelope-id",
  "status": "sent",
  "message": "Envelope sent successfully. All signers will receive email notifications in sequential order."
}
```

### Step 2: iPay Receives Notification and Signs
iPay is the first signer:

1. **iPay receives an email** from DocuSign immediately
2. Email contains a link to review and sign the document
3. iPay clicks the link and signs via DocuSign's web interface
4. After iPay signs, Borrower receives email notification

### Step 3: Borrower Receives Notification and Signs
After iPay completes signing:

1. **Borrower receives an email** from DocuSign
2. Email contains a link to review the pre-filled loan application
3. Borrower clicks the link and signs via DocuSign's web interface
4. After Borrower signs, Organization receives email notification

### Step 4: Organization Receives Notification and Signs
After Borrower completes signing:

1. **Organization receives an email** from DocuSign
2. Email contains a link to review and sign the document
3. Organization clicks the link and signs via DocuSign's web interface
4. After Organization signs, the document is **completed**

### Step 5: Document Completion
When all three parties have signed:

1. DocuSign sends webhook notification to your app
2. Your app updates the loan status to `documents_signed`
3. All parties receive a copy of the fully executed document

## Code Implementation

### Envelope Creation (jwt-client.ts)

```typescript
export function makeEnvelope(
  borrowerName: string, 
  borrowerEmail: string, 
  tabValues?: Record<string, string>,
  useEmbeddedSigning: boolean = true
) {
  const env = new docusign.EnvelopeDefinition();
  env.templateId = TEMPLATE_ID;

  // Signer 1: iPay (Email notification)
  const iPay = new docusign.TemplateRole();
  iPay.email = 'jhoamadrian@gmail.com';
  iPay.name = 'iPay Representative';
  iPay.roleName = 'iPay';
  (iPay as any).routingOrder = '1';

  // Signer 2: Borrower (Embedded signing)
  const borrower = new docusign.TemplateRole();
  borrower.email = borrowerEmail;
  borrower.name = borrowerName;
  borrower.roleName = 'Borrower';
  (borrower as any).routingOrder = '2';
  borrower.tabs = tabs; // Pre-filled data
  borrower.clientUserId = INTEGRATION_KEY; // Enables embedded signing

  // Signer 3: Organization (Email notification)
  const organization = new docusign.TemplateRole();
  organization.email = 'jgarcia@easycarus.com';
  organization.name = 'Organization Representative';
  organization.roleName = 'Organization';
  (organization as any).routingOrder = '3';

  env.templateRoles = [iPay, borrower, organization];
  env.status = 'sent';

  return env;
}
```

### Key Configuration

**Environment Variables:**
```env
INTEGRATION_KEY=ba99d403-dc7d-4679-85a5-d31e6c451f42
BASE_PATH=https://demo.docusign.net/restapi
USER_ID=19a99013-2a5a-413f-8428-79d5cee8da49
TEMPLATE_ID=8b9711f2-c304-4467-aa5c-27ebca4b4cc4
API_ACCOUNT_ID=8c7006b6-1cda-42d7-9c39-a302c63394bd
```

**Signer Emails (hardcoded in jwt-client.ts):**
```typescript
const IPAY_EMAIL = 'jhoamadrian@gmail.com';
const ORGANIZATION_EMAIL = 'jgarcia@easycarus.com';
```

## Signing Status Tracking

The envelope progresses through these statuses:

1. **sent** - Envelope created, iPay notified
2. **delivered** - iPay opened the email
3. **signed** - iPay completed signing, Borrower's turn
4. **signed** - Borrower completed signing, Organization's turn
5. **signed** - Organization completed signing
6. **completed** - All signatures collected

You can check the status at any time:

```typescript
GET /api/docusign/envelope-status?envelopeId=xxx
```

## Important Notes

### Routing Order
The `routingOrder` property ensures signers receive the document in sequence:
- iPay must sign first (order 1)
- Borrower signs second (order 2)
- Organization signs last (order 3)

### Email Signing for All

**All signers (iPay, Borrower, Organization):**
- Receive email notifications from DocuSign
- Click link in email to review and sign
- Sign via DocuSign's secure web interface
- Sequential order enforced by routing order
- No embedded signing or `clientUserId` used

### Template Role Names

The role names in your code **must match exactly** (case-sensitive) with the roles defined in your DocuSign template:
- `iPay` (not "ipay" or "IPay")
- `Borrower` (not "borrower")
- `Organization` (not "organization")

## Testing the Flow

### 1. Test Envelope Creation

```bash
curl -X POST http://localhost:3000/api/docusign/create-envelope \
  -H "Content-Type: application/json" \
  -d '{"loanId": "your-test-loan-id"}'
```

**Expected Response:**
```json
{
  "success": true,
  "envelopeId": "envelope-id",
  "status": "sent",
  "message": "Envelope sent successfully. All signers will receive email notifications in sequential order."
}
```

### 2. Check iPay's Email
1. Check `jhoamadrian@gmail.com` inbox
2. Look for DocuSign notification (should arrive immediately)
3. Click the link and sign
4. Verify Borrower receives notification next

### 3. Check Borrower's Email
1. Check the borrower's email (from application)
2. Look for DocuSign notification (arrives after iPay signs)
3. Click the link and sign
4. Verify Organization receives notification next

### 4. Check Organization's Email
1. Check `jgarcia@easycarus.com` inbox
2. Look for DocuSign notification (arrives after Borrower signs)
3. Click the link and sign
4. Verify envelope status becomes "completed"

## Troubleshooting

### Issue: "Role name not found"
**Solution:** Verify the role names in your template exactly match:
- `iPay`
- `Borrower`
- `Organization`

### Issue: "Emails not arriving in order"
**Solution:** Verify that `routingOrder` is set correctly (1, 2, 3) and that previous signer has completed signing.

### Issue: "Signers receive document out of order"
**Solution:** Check that `routingOrder` is set correctly (1, 2, 3) for each signer.

### Issue: "Organization receives notification before iPay signs"
**Solution:** Verify routing order is set and envelope status is "sent" (not "created").

## Customization

### Change Signer Emails

Edit `src/utils/docusign/jwt-client.ts`:

```typescript
const IPAY_EMAIL = 'newemail@ipay.com';
const ORGANIZATION_EMAIL = 'newemail@organization.com';
```

### Add More Signers

Add additional template roles with sequential routing orders:

```typescript
const signer4 = new docusign.TemplateRole();
signer4.email = 'signer4@example.com';
signer4.name = 'Fourth Signer';
signer4.roleName = 'RoleName4';
(signer4 as any).routingOrder = '4';

env.templateRoles = [iPay, borrower, organization, signer4];
```

### Enable Embedded Signing for Borrower

If you want the borrower to sign immediately (embedded), add `clientUserId`:

```typescript
// In makeEnvelope function, add this line:
borrower.clientUserId = INTEGRATION_KEY;
```

Then call `createRecipientView` to generate signing URL and redirect borrower.

---

**Created**: 2025-09-30
**Last Updated**: 2025-09-30
