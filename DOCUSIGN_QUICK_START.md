# DocuSign Integration - Quick Start Guide

Complete guide to test your DocuSign integration in 3 simple steps.

## Prerequisites Checklist

Before testing, ensure you have:

- [x] **RSA Private Key** - Added to `private.key` file in root directory
- [x] **Environment Variables** - All DocuSign variables configured in `.env`
- [x] **Dependencies Installed** - Run `npm install`
- [x] **Dev Server Running** - Run `npm run dev` in another terminal

## 3-Step Testing Process

### Step 1: Create Test Data

Run this command to create a complete test borrower and loan:

```bash
npm run test:create-loan
```

**What this does:**
- Creates test borrower: John Doe (testborrower@example.com)
- Creates test loan: $25,000 Auto Loan
- Displays the Loan ID you need for testing
- Shows ready-to-use test commands

**Expected Output:**
```
🚀 Creating test loan data for DocuSign testing...

📝 Creating test borrower...
✅ Borrower created successfully
   ID: abc-123-borrower-id
   Name: John Doe
   Email: testborrower@example.com

📝 Creating test loan...
✅ Loan created successfully
   ID: xyz-456-loan-id
   Loan Number: LOAN-TEST-1234567890
   Amount: $25000
   Type: Auto Loan
   Vehicle: 2020 Toyota Camry

🎉 Test data created successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TEST INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 IDs for Testing:
   Borrower ID: abc-123-borrower-id
   Loan ID: xyz-456-loan-id
   Loan Number: LOAN-TEST-1234567890

📧 Email Addresses:
   1. iPay: jhoamadrian@gmail.com (signs first)
   2. Borrower: testborrower@example.com (signs second)
   3. Organization: jgarcia@easycarus.com (signs third)

🧪 Test with cURL:
   curl -X POST http://localhost:3000/api/docusign/create-envelope \
     -H "Content-Type: application/json" \
     -d '{"loanId": "xyz-456-loan-id"}'
```

**Copy the Loan ID from the output - you'll need it for Step 2!**

---

### Step 2: Test DocuSign Integration

Choose one of these methods to test:

#### Method A: cURL (Recommended)

Copy and run the cURL command from Step 1 output:

```bash
curl -X POST http://localhost:3000/api/docusign/create-envelope \
  -H "Content-Type: application/json" \
  -d '{"loanId": "YOUR_LOAN_ID_HERE"}'
```

#### Method B: Browser Console

1. Open `http://localhost:3000` in your browser
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Paste and run:

```javascript
fetch('/api/docusign/create-envelope', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ loanId: 'YOUR_LOAN_ID_HERE' })
})
.then(r => r.json())
.then(data => console.log('✅ Success:', data))
.catch(err => console.error('❌ Error:', err));
```

#### Method C: Test Page (Optional)

1. Create the test page (see DOCUSIGN_TEST_DATA.md)
2. Visit `http://localhost:3000/test-docusign`
3. Paste your Loan ID
4. Click "Test DocuSign Integration"

**Expected Response:**
```json
{
  "success": true,
  "envelopeId": "abc-123-envelope-id",
  "status": "sent",
  "message": "Envelope sent successfully. All signers will receive email notifications in sequential order."
}
```

**Check your terminal** for detailed logs:
```
🔑 Generating new JWT access token
✅ JWT token obtained successfully
📋 Creating DocuSign envelope for loan: xyz-456-loan-id
👤 Borrower: John Doe testborrower@example.com
📝 Fields to populate: 21
📝 Created 15 text tabs, 5 number tabs, 1 date tabs
📋 Envelope created with 3 signers (all via email):
  1. iPay: jhoamadrian@gmail.com (will receive email first)
  2. Borrower: testborrower@example.com (will receive email after iPay signs)
  3. Organization: jgarcia@easycarus.com (will receive email after Borrower signs)
📤 Creating envelope with 3 signers (all via email)...
✅ Envelope created and sent: abc-123-envelope-id
```

---

### Step 3: Verify Email Flow

#### 3.1 Check iPay Email (Immediate)

1. Open `jhoamadrian@gmail.com` inbox
2. Look for email from DocuSign (arrives within 1-2 minutes)
3. Subject: "Please DocuSign: [Document Name]"
4. Click **"REVIEW DOCUMENT"** button
5. Review and sign the document
6. ✅ After signing, Borrower receives email

#### 3.2 Check Borrower Email (After iPay Signs)

1. Open `testborrower@example.com` inbox
2. Wait for email (arrives after iPay completes signing)
3. Click **"REVIEW DOCUMENT"** button
4. **Verify pre-filled fields:**
   - ✅ Name: John Doe
   - ✅ Email: testborrower@example.com
   - ✅ Phone: +15551234567
   - ✅ Address: 123 Main Street, New York, NY 10001
   - ✅ Employer: Acme Corporation
   - ✅ Income: $75,000
   - ✅ Loan Amount: $25,000
   - ✅ Vehicle: 2020 Toyota Camry
   - ✅ References: Jane Smith, Bob Johnson, Alice Brown
5. Review and sign the document
6. ✅ After signing, Organization receives email

#### 3.3 Check Organization Email (After Borrower Signs)

1. Open `jgarcia@easycarus.com` inbox
2. Wait for email (arrives after Borrower completes signing)
3. Click **"REVIEW DOCUMENT"** button
4. Review and sign the document
5. ✅ After signing, envelope is **COMPLETED**

---

### Step 4: Clean Up

After testing, remove the test data:

```bash
npm run test:cleanup
```

**What this does:**
- Removes all test loans (LOAN-TEST-*)
- Removes test borrower (testborrower@example.com)
- Shows summary of deleted records

**Expected Output:**
```
🧹 Cleaning up test loan data...

🔍 Finding test loans...
📋 Found 1 test loan(s):
   1. LOAN-TEST-1234567890 (ID: xyz-456-loan-id)

🗑️  Deleting test loans...
✅ Deleted 1 test loan(s)

🔍 Finding test borrower...
📋 Found test borrower: John Doe (testborrower@example.com)

🗑️  Deleting test borrower...
✅ Deleted test borrower

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 CLEANUP COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Removed 1 test loan(s)
✅ Removed 1 test borrower(s)

💡 Run "npm run test:create-loan" to create new test data
```

---

## Troubleshooting

### ❌ Error: "private.key file is empty"

**Solution:** Add your RSA private key to `private.key` file:

1. Log into DocuSign Admin
2. Go to **Apps and Keys**
3. Find your Integration Key
4. Click **Actions** → **Edit**
5. Under **Service Integration**, click **Generate RSA**
6. Copy the **Private Key**
7. Paste into `private.key` file in root directory

### ❌ Error: "Missing API_ACCOUNT_ID"

**Solution:** Check your `.env` file has:
```env
API_ACCOUNT_ID=8c7006b6-1cda-42d7-9c39-a302c63394bd
```

### ❌ Error: "Failed to obtain JWT token"

**Possible causes:**
1. Private key doesn't match the public key in DocuSign
2. Integration Key is incorrect
3. User ID is incorrect
4. JWT is not enabled for your Integration Key

**Solution:** Verify all credentials in `.env` match your DocuSign account.

### ❌ No emails received

**Check:**
1. Spam/junk folders
2. Email addresses in console logs
3. DocuSign dashboard - was envelope created?
4. Envelope status is "sent" not "created"

### ❌ Fields not pre-filled

**Check:**
1. Console logs show "Created X text tabs, Y number tabs"
2. Tab labels in template match field names in code
3. Test data has values for those fields

---

## Verification Checklist

After testing, verify:

- [ ] **Server logs** show envelope creation
- [ ] **iPay email** received and signed
- [ ] **Borrower email** received after iPay signs
- [ ] **Borrower fields** are pre-filled correctly
- [ ] **Organization email** received after Borrower signs
- [ ] **Envelope status** is "completed" after all sign
- [ ] **Supabase** has `docusign_envelope_id` and `docusign_status`
- [ ] **DocuSign dashboard** shows envelope with all signers

---

## Quick Reference

**Create test data:**
```bash
npm run test:create-loan
```

**Test DocuSign:**
```bash
curl -X POST http://localhost:3000/api/docusign/create-envelope \
  -H "Content-Type: application/json" \
  -d '{"loanId": "YOUR_LOAN_ID"}'
```

**Clean up:**
```bash
npm run test:cleanup
```

**Check database:**
```sql
SELECT id, loan_number, docusign_envelope_id, docusign_status
FROM loans
WHERE loan_number LIKE 'LOAN-TEST-%';
```

---

## Next Steps

Once testing is successful:

1. ✅ Integration is working correctly
2. 🔄 Integrate into your application flow
3. 📧 Configure DocuSign webhook for production
4. 🚀 Deploy to production environment
5. 🔐 Update to production DocuSign credentials

---

**Need help?** Check the detailed guides:
- `DOCUSIGN_SETUP.md` - Complete setup instructions
- `DOCUSIGN_SIGNING_FLOW.md` - Signing process details
- `DOCUSIGN_TAB_MAPPING.md` - Field mapping reference
- `DOCUSIGN_TEST_DATA.md` - Detailed testing guide

**Created**: 2025-09-30
**Last Updated**: 2025-09-30
