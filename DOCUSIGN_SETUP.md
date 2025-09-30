# DocuSign Integration Setup Guide

This guide explains how to set up and use the DocuSign integration for the loan application process.

## Overview

The DocuSign integration allows borrowers to electronically sign loan documents after completing their application. The flow works as follows:

1. **Borrower completes application** → Data is saved to Supabase
2. **System creates DocuSign envelope** → Loan data populates the PDF template
3. **Borrower signs document** → Embedded signing ceremony
4. **DocuSign notifies system** → Webhook updates loan status
5. **Document is completed** → Loan moves to next stage

## Prerequisites

### 1. DocuSign Account Setup

You need a DocuSign Developer account with the following:

- **Integration Key** (Client ID)
- **User ID** (API Username)
- **RSA Private Key** (for JWT authentication)
- **Account ID** (same as User ID in this setup)
- **Template ID** (your loan application template)

### 2. RSA Private Key

**IMPORTANT**: Your `private.key` file in the root directory is currently empty. You need to add your RSA private key from DocuSign.

To get your private key:
1. Log into DocuSign Admin
2. Go to **Apps and Keys**
3. Find your Integration Key
4. Click **Actions** → **Edit**
5. Under **Service Integration**, click **Generate RSA**
6. Copy the **Private Key** and paste it into `private.key` file

The file should look like this:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(your key content here)
...
-----END RSA PRIVATE KEY-----
```

## Environment Variables

Your `.env` file has been configured with the following DocuSign variables:

```env
# DocuSign Configuration (JWT Grant)
INTEGRATION_KEY=ba99d403-dc7d-4679-85a5-d31e6c451f42
BASE_PATH=https://demo.docusign.net/restapi
USER_ID=19a99013-2a5a-413f-8428-79d5cee8da49
TEMPLATE_ID=8b9711f2-c304-4467-aa5c-27ebca4b4cc4
```

**Note**: 
- `ACCOUNT_ID` = `USER_ID` (19a99013-2a5a-413f-8428-79d5cee8da49)
- `CLIENT_USER_ID` = `INTEGRATION_KEY` (ba99d403-dc7d-4679-85a5-d31e6c451f42)

## Project Structure

### Created Files

```
src/
├── utils/
│   └── docusign/
│       ├── jwt-client.ts          # JWT authentication & API client
│       └── field-mapper.ts        # Maps loan data to DocuSign fields
└── app/
    └── api/
        └── docusign/
            ├── create-envelope/
            │   └── route.ts       # Creates envelope & returns signing URL
            ├── envelope-status/
            │   └── route.ts       # Checks envelope status
            └── webhook/
                └── route.ts       # Receives DocuSign notifications
```

## API Endpoints

### 1. Create Envelope

**POST** `/api/docusign/create-envelope`

Creates a DocuSign envelope with loan data and returns the signing URL.

**Request Body:**
```json
{
  "loanId": "uuid-of-loan"
}
```

**Response:**
```json
{
  "success": true,
  "envelopeId": "envelope-id-from-docusign",
  "signingUrl": "https://demo.docusign.net/Signing/..."
}
```

**Example Usage:**
```typescript
const response = await fetch('/api/docusign/create-envelope', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ loanId: 'loan-uuid' })
});

const { signingUrl } = await response.json();
// Redirect borrower to signingUrl
window.location.href = signingUrl;
```

### 2. Check Envelope Status

**GET** `/api/docusign/envelope-status?envelopeId=xxx`

Gets the current status of a DocuSign envelope.

**Response:**
```json
{
  "success": true,
  "status": "completed",
  "sentDateTime": "2025-09-30T10:00:00Z",
  "completedDateTime": "2025-09-30T10:15:00Z",
  "envelopeId": "envelope-id"
}
```

### 3. Webhook (DocuSign → Your App)

**POST** `/api/docusign/webhook`

Receives notifications from DocuSign when envelope events occur.

**Events:**
- `envelope-sent` - Envelope sent to recipient
- `envelope-delivered` - Recipient opened the envelope
- `envelope-completed` - All parties have signed
- `envelope-declined` - Recipient declined to sign
- `envelope-voided` - Envelope was voided

## Integration Flow

### Step 1: After Application Submission

When a borrower completes their loan application (in `/apply/[loanId]/page.tsx`), trigger the DocuSign envelope creation:

```typescript
// After successful application submission
const response = await fetch('/api/docusign/create-envelope', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ loanId })
});

if (response.ok) {
  const { signingUrl } = await response.json();
  // Redirect to DocuSign signing ceremony
  window.location.href = signingUrl;
}
```

### Step 2: Borrower Signs Document

The borrower will be redirected to DocuSign's embedded signing interface where they can:
- Review the pre-filled loan application
- Sign the document electronically
- Complete the signing ceremony

### Step 3: Return to Your App

After signing, the borrower is redirected to the return URL you specified:
```
http://localhost:3000/apply/[loanId]/docusign-complete
```

You'll need to create this page to handle the return.

### Step 4: Webhook Updates

DocuSign will send webhook notifications to:
```
http://localhost:3000/api/docusign/webhook
```

The webhook automatically updates the loan record in Supabase with the signing status.

## Database Schema Updates

You'll need to add these columns to your `loans` table:

```sql
ALTER TABLE loans ADD COLUMN IF NOT EXISTS docusign_envelope_id TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS docusign_status TEXT;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS docusign_completed_at TIMESTAMPTZ;
```

## Field Mapping

The `field-mapper.ts` utility maps your loan data to DocuSign template fields. The current mapping includes:

### Borrower Information
- `borrower_first_name`
- `borrower_last_name`
- `borrower_email`
- `borrower_phone_number`
- `borrower_phone_country_code`
- `date_of_birth`

### Address
- `borrower_address_line_1`
- `borrower_city`
- `borrower_state`
- `borrower_zip_code`
- `borrower_country`

### Employment
- `employment_status`
- `borrower_employer`
- `borrower_employer_state`
- `borrower_employed_time`
- `borrower_salary`
- `annual_income`

### Loan Details
- `loan_amount`
- `loan_type`
- `loan_term`
- `interest_rate`
- `monthly_payment`

### References
- `borrower_reference_name_1`, `borrower_reference_name_1 _phone`, `borrower_reference_name_1 _country_code`
- `borrower_reference_name_2`, `borrower_reference_name_2_phone`, `borrower_reference_name_2_country_code`
- `borrower_reference_name_3`, `borrower_reference_name_3_phone`

**Important**: These field names must match the tab labels in your DocuSign template exactly (case-sensitive). Update `field-mapper.ts` if your template uses different field names.

## Testing

### 1. Test JWT Authentication

Create a test endpoint or use the create-envelope endpoint to verify JWT authentication works:

```bash
# The first call will generate a new JWT token
# Check your console for: "🔑 Generating new JWT access token"
# Followed by: "✅ JWT token obtained successfully"
```

### 2. Test Envelope Creation

```bash
curl -X POST http://localhost:3000/api/docusign/create-envelope \
  -H "Content-Type: application/json" \
  -d '{"loanId": "your-test-loan-id"}'
```

### 3. Test Webhook (Local Development)

For local testing, use ngrok or a similar tool to expose your webhook endpoint:

```bash
ngrok http 3000
```

Then configure the ngrok URL in DocuSign Connect:
```
https://your-ngrok-url.ngrok.io/api/docusign/webhook
```

## Common Issues & Solutions

### Issue: "private.key file is empty"
**Solution**: Add your RSA private key to the `private.key` file in the root directory.

### Issue: "Failed to obtain JWT token"
**Solution**: 
1. Verify your Integration Key and User ID are correct
2. Ensure the private key matches the public key in DocuSign
3. Check that JWT is enabled for your Integration Key in DocuSign Admin

### Issue: "Template fields not populating"
**Solution**: 
1. Verify field names in `field-mapper.ts` match your DocuSign template exactly
2. Check that the template role name is "Applicant" (or update in `jwt-client.ts`)
3. Ensure data exists in Supabase for the fields you're trying to populate

### Issue: "Webhook not receiving events"
**Solution**:
1. Configure DocuSign Connect in DocuSign Admin
2. Add your webhook URL
3. Enable the events you want to receive
4. For local development, use ngrok

## Next Steps

1. **Add RSA Private Key**: Copy your private key into `private.key` file
2. **Test Authentication**: Make a test API call to verify JWT works
3. **Update Field Mapping**: Adjust field names in `field-mapper.ts` to match your template
4. **Create Return Page**: Build `/apply/[loanId]/docusign-complete` page
5. **Integrate into Application Flow**: Add envelope creation after application submission
6. **Configure Webhook**: Set up DocuSign Connect to point to your webhook endpoint
7. **Update Database**: Add the required columns to your `loans` table

## Production Considerations

1. **Token Storage**: Consider using Redis or a database for token storage instead of in-memory
2. **Error Handling**: Add comprehensive error logging and monitoring
3. **Retry Logic**: Implement retry logic for failed API calls
4. **Security**: Validate webhook signatures from DocuSign
5. **Base Path**: Update `BASE_PATH` from demo to production DocuSign URL
6. **Rate Limiting**: Implement rate limiting on your API endpoints

## Support

For DocuSign API documentation, visit:
- [DocuSign Developer Center](https://developers.docusign.com/)
- [JWT Authentication Guide](https://developers.docusign.com/platform/auth/jwt/)
- [Embedded Signing](https://developers.docusign.com/docs/esign-rest-api/how-to/request-signature-in-app-embedded/)

---

**Created**: 2025-09-30
**Last Updated**: 2025-09-30
