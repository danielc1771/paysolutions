# DocuSign Integration Testing Guide

This guide provides complete test data and step-by-step instructions to test the DocuSign integration without filling out the application online.

## Quick Start (Recommended)

### Using npm Scripts (Easiest Method)

**Step 1: Install dependencies (if not already installed)**
```bash
npm install
```

**Step 2: Create test data**
```bash
npm run test:create-loan
```

This will:
- Create a test borrower with complete information
- Create a test loan linked to that borrower
- Display the Loan ID and testing instructions
- Show you the cURL command to test DocuSign

**Step 3: Test DocuSign integration**
Copy the cURL command from the output and run it, or use the Loan ID with any testing method below.

**Step 4: Clean up after testing**
```bash
npm run test:cleanup
```

This removes all test data from your database.

---

## Test Data Setup (Manual Methods)

### Step 1: Insert Test Borrower

Run this SQL in your Supabase SQL Editor:

```sql
-- Insert test borrower
INSERT INTO borrowers (
  id,
  email,
  first_name,
  last_name,
  phone,
  date_of_birth,
  address,
  city,
  state,
  zip_code,
  country,
  employment_status,
  annual_income,
  current_employer_name,
  employer_state,
  time_with_employment,
  reference1_name,
  reference1_phone,
  reference1_email,
  reference1_country_code,
  reference2_name,
  reference2_phone,
  reference2_email,
  reference2_country_code,
  reference3_name,
  reference3_phone,
  reference3_email,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'testborrower@example.com',
  'John',
  'Doe',
  '+15551234567',
  '1990-05-15',
  '123 Main Street',
  'New York',
  'NY',
  '10001',
  'US',
  'employed',
  75000,
  'Acme Corporation',
  'NY',
  '3 years',
  'Jane Smith',
  '5559876543',
  'jane.smith@example.com',
  '+1',
  'Bob Johnson',
  '5551112222',
  'bob.johnson@example.com',
  '+1',
  'Alice Brown',
  '5553334444',
  'alice.brown@example.com',
  NOW(),
  NOW()
) RETURNING id;
```

**Save the returned `id` - you'll need it for the next step!**

### Step 2: Insert Test Loan

Replace `'BORROWER_ID_HERE'` with the ID from Step 1:

```sql
-- Insert test loan
INSERT INTO loans (
  id,
  borrower_id,
  loan_number,
  principal_amount,
  interest_rate,
  term_weeks,
  weekly_payment,
  amount,
  loan_type,
  term_months,
  monthly_payment,
  status,
  vehicle_year,
  vehicle_make,
  vehicle_model,
  vehicle_vin,
  customer_first_name,
  customer_last_name,
  application_step,
  phone_verification_status,
  verified_phone_number,
  stripe_verification_status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'BORROWER_ID_HERE', -- Replace with borrower ID from Step 1
  'LOAN-TEST-' || EXTRACT(EPOCH FROM NOW())::TEXT,
  25000.00,
  5.5,
  156, -- 36 months = 156 weeks
  185.50,
  25000.00,
  'Auto Loan',
  36,
  750.00,
  'application_completed',
  '2020',
  'Toyota',
  'Camry',
  '1HGBH41JXMN109186',
  'John',
  'Doe',
  9,
  'verified',
  '+15551234567',
  'verified',
  NOW(),
  NOW()
) RETURNING id, loan_number;
```

**Save the returned `id` and `loan_number` - you'll use the ID for testing!**

## Alternative: Quick Test Data Script

Create a file `test-data-insert.sql` and run it in Supabase:

```sql
-- Complete test data insertion script
DO $$
DECLARE
  v_borrower_id UUID;
  v_loan_id UUID;
  v_loan_number TEXT;
BEGIN
  -- Insert test borrower
  INSERT INTO borrowers (
    email, first_name, last_name, phone, date_of_birth,
    address, city, state, zip_code, country,
    employment_status, annual_income, current_employer_name,
    employer_state, time_with_employment,
    reference1_name, reference1_phone, reference1_email, reference1_country_code,
    reference2_name, reference2_phone, reference2_email, reference2_country_code,
    reference3_name, reference3_phone, reference3_email
  ) VALUES (
    'testborrower@example.com',
    'John', 'Doe', '+15551234567', '1990-05-15',
    '123 Main Street', 'New York', 'NY', '10001', 'US',
    'employed', 75000, 'Acme Corporation', 'NY', '3 years',
    'Jane Smith', '5559876543', 'jane.smith@example.com', '+1',
    'Bob Johnson', '5551112222', 'bob.johnson@example.com', '+1',
    'Alice Brown', '5553334444', 'alice.brown@example.com'
  ) RETURNING id INTO v_borrower_id;

  -- Generate loan number
  v_loan_number := 'LOAN-TEST-' || EXTRACT(EPOCH FROM NOW())::TEXT;

  -- Insert test loan
  INSERT INTO loans (
    borrower_id, loan_number, principal_amount, interest_rate,
    term_weeks, weekly_payment, amount, loan_type, term_months,
    monthly_payment, status, vehicle_year, vehicle_make,
    vehicle_model, vehicle_vin, customer_first_name, customer_last_name,
    application_step, phone_verification_status, verified_phone_number,
    stripe_verification_status
  ) VALUES (
    v_borrower_id, v_loan_number, 25000.00, 5.5,
    156, 185.50, 25000.00, 'Auto Loan', 36,
    750.00, 'application_completed', '2020', 'Toyota',
    'Camry', '1HGBH41JXMN109186', 'John', 'Doe',
    9, 'verified', '+15551234567', 'verified'
  ) RETURNING id INTO v_loan_id;

  -- Output the IDs
  RAISE NOTICE 'Borrower ID: %', v_borrower_id;
  RAISE NOTICE 'Loan ID: %', v_loan_id;
  RAISE NOTICE 'Loan Number: %', v_loan_number;
END $$;
```

Check the Supabase logs to see the generated IDs.

## Testing the DocuSign Flow

### Prerequisites

1. ✅ RSA private key added to `private.key` file
2. ✅ Environment variables configured in `.env`
3. ✅ Test data inserted in Supabase (from above)
4. ✅ Development server running (`npm run dev`)

### Test Method 1: Using cURL

**Step 1: Get your test loan ID**
```sql
SELECT id, loan_number, borrower_id 
FROM loans 
WHERE loan_number LIKE 'LOAN-TEST-%' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Step 2: Call the API**
Replace `YOUR_LOAN_ID_HERE` with the ID from Step 1:

```bash
curl -X POST http://localhost:3000/api/docusign/create-envelope \
  -H "Content-Type: application/json" \
  -d '{"loanId": "YOUR_LOAN_ID_HERE"}'
```

**Expected Response:**
```json
{
  "success": true,
  "envelopeId": "abc123-envelope-id",
  "status": "sent",
  "message": "Envelope sent successfully. All signers will receive email notifications in sequential order."
}
```

### Test Method 2: Using Postman

1. **Open Postman**
2. **Create new POST request**
3. **URL:** `http://localhost:3000/api/docusign/create-envelope`
4. **Headers:**
   - `Content-Type`: `application/json`
5. **Body (raw JSON):**
```json
{
  "loanId": "YOUR_LOAN_ID_HERE"
}
```
6. **Click Send**

### Test Method 3: Using Browser Console

1. **Open your app** in browser: `http://localhost:3000`
2. **Open Developer Tools** (F12)
3. **Go to Console tab**
4. **Run this code:**

```javascript
fetch('/api/docusign/create-envelope', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ loanId: 'YOUR_LOAN_ID_HERE' })
})
.then(r => r.json())
.then(data => console.log('Success:', data))
.catch(err => console.error('Error:', err));
```

### Test Method 4: Create a Test Page

Create `src/app/test-docusign/page.tsx`:

```typescript
'use client';

import { useState } from 'react';

export default function TestDocuSignPage() {
  const [loanId, setLoanId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testDocuSign = async () => {
    if (!loanId.trim()) {
      setError('Please enter a loan ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/docusign/create-envelope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanId: loanId.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create envelope');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-6">DocuSign Integration Test</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loan ID
            </label>
            <input
              type="text"
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
              placeholder="Enter loan ID from Supabase"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={testDocuSign}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Envelope...' : 'Test DocuSign Integration'}
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-medium">Error:</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700 font-medium mb-2">Success!</p>
              <div className="text-sm space-y-1">
                <p><strong>Envelope ID:</strong> {result.envelopeId}</p>
                <p><strong>Status:</strong> {result.status}</p>
                <p><strong>Message:</strong> {result.message}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="font-semibold mb-2">What to check:</h2>
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Check jhoamadrian@gmail.com for iPay email</li>
            <li>Check testborrower@example.com for Borrower email (after iPay signs)</li>
            <li>Check jgarcia@easycarus.com for Organization email (after Borrower signs)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
```

Then visit: `http://localhost:3000/test-docusign`

## Verification Steps

### 1. Check Server Console
You should see logs like:
```
🔑 Generating new JWT access token
✅ JWT token obtained successfully
📋 Creating DocuSign envelope for loan: abc-123-loan-id
👤 Borrower: John Doe testborrower@example.com
📝 Fields to populate: 21
📝 Created 15 text tabs, 5 number tabs, 1 date tabs
📋 Envelope created with 3 signers (all via email):
  1. iPay: jhoamadrian@gmail.com (will receive email first)
  2. Borrower: testborrower@example.com (will receive email after iPay signs)
  3. Organization: jgarcia@easycarus.com (will receive email after Borrower signs)
📤 Creating envelope with 3 signers (all via email)...
✅ Envelope created and sent: envelope-id-here
```

### 2. Check iPay Email
1. Open `jhoamadrian@gmail.com` inbox
2. Look for email from DocuSign (should arrive within 1-2 minutes)
3. Email subject: "Please DocuSign: [Document Name]"
4. Click "REVIEW DOCUMENT" button
5. Sign the document
6. After signing, Borrower should receive email

### 3. Check Borrower Email
1. Open `testborrower@example.com` inbox
2. Wait for email (arrives after iPay signs)
3. Click "REVIEW DOCUMENT" button
4. Verify pre-filled fields:
   - Name: John Doe
   - Email: testborrower@example.com
   - Phone: +15551234567
   - Address: 123 Main Street, New York, NY 10001
   - Employer: Acme Corporation
   - Income: $75,000
   - Loan Amount: $25,000
   - References: Jane Smith, Bob Johnson, Alice Brown
5. Sign the document
6. After signing, Organization should receive email

### 4. Check Organization Email
1. Open `jgarcia@easycarus.com` inbox
2. Wait for email (arrives after Borrower signs)
3. Click "REVIEW DOCUMENT" button
4. Sign the document
5. After signing, envelope is completed

### 5. Check Supabase Database
```sql
SELECT 
  id,
  loan_number,
  docusign_envelope_id,
  docusign_status,
  docusign_completed_at,
  status
FROM loans
WHERE loan_number LIKE 'LOAN-TEST-%'
ORDER BY created_at DESC
LIMIT 1;
```

You should see:
- `docusign_envelope_id`: populated with envelope ID
- `docusign_status`: 'sent' initially, then 'completed' after all sign
- `status`: should update to 'documents_signed' after completion

### 6. Check DocuSign Dashboard
1. Log into DocuSign: https://demo.docusign.net
2. Go to **Manage** → **Sent**
3. Find your envelope by ID
4. Click to view details
5. Verify:
   - All 3 recipients listed
   - Signing order: iPay (1), Borrower (2), Organization (3)
   - Status of each signer
   - Pre-filled field values

## Troubleshooting

### Error: "private.key file is empty"
**Solution:** Add your RSA private key to the `private.key` file in the root directory.

### Error: "Missing API_ACCOUNT_ID"
**Solution:** Verify `.env` has `API_ACCOUNT_ID=8c7006b6-1cda-42d7-9c39-a302c63394bd`

### Error: "Loan not found"
**Solution:** 
- Verify the loan ID is correct
- Check that test data was inserted successfully
- Run: `SELECT id FROM loans WHERE loan_number LIKE 'LOAN-TEST-%'`

### Error: "Missing required fields"
**Solution:** 
- Check that borrower has all required fields (first_name, last_name, email)
- Verify loan has amount field populated

### Error: "Role name not found"
**Solution:** 
- Verify your DocuSign template has roles named exactly: `iPay`, `Borrower`, `Organization`
- Check case sensitivity

### No emails received
**Solution:**
- Check spam/junk folders
- Verify email addresses in console logs
- Check DocuSign dashboard to see if envelope was created
- Ensure envelope status is "sent" not "created"

### Fields not pre-filled
**Solution:**
- Check console logs for "Created X text tabs, Y number tabs, Z date tabs"
- Verify tab labels in your template match field names in `field-mapper.ts`
- Check that test data has values for those fields

## Clean Up Test Data

After testing, clean up:

```sql
-- Delete test loan and borrower
DELETE FROM loans WHERE loan_number LIKE 'LOAN-TEST-%';
DELETE FROM borrowers WHERE email = 'testborrower@example.com';
```

## Quick Reference

**Test Loan Data:**
- Borrower: John Doe (testborrower@example.com)
- Loan Amount: $25,000
- Loan Type: Auto Loan
- Vehicle: 2020 Toyota Camry
- Employer: Acme Corporation
- Income: $75,000/year

**Signer Emails:**
1. iPay: jhoamadrian@gmail.com
2. Borrower: testborrower@example.com
3. Organization: jgarcia@easycarus.com

**API Endpoint:**
```
POST http://localhost:3000/api/docusign/create-envelope
Body: {"loanId": "YOUR_LOAN_ID"}
```

---

**Created**: 2025-09-30
**Last Updated**: 2025-09-30
