# DocuSign Integration Setup Guide

## Step 1: Create DocuSign Developer Account

1. Go to https://developers.docusign.com/
2. Sign up for a free developer account
3. Verify your email address

## Step 2: Create Integration App

1. Log into your DocuSign Developer Account
2. Go to **Apps & Keys** section
3. Click **+ ADD APP AND INTEGRATION KEY**
4. Fill out the form:
   - **App Name**: PaySolutions Loans
   - **Description**: Loan agreement signing integration
   - **Select your app type**: Server-side Web App
5. Click **CREATE APP**

## Step 3: Configure App for JWT Authentication

1. In your app settings, scroll to **Authentication**
2. Click **+ GENERATE RSA** to create a public/private key pair
3. **IMPORTANT**: Copy the private key and save it securely
4. The public key will be automatically added to your app

## Step 4: Get Required Credentials

From your app's **Apps & Keys** page, collect:

- **Integration Key** (Client ID) - looks like: `12345678-1234-1234-1234-123456789012`
- **Secret Key** (if shown)
- **RSA Private Key** (from step 3)

## Step 5: Get User ID

1. In DocuSign Developer Account, go to **My Account** → **Apps & Keys**
2. Scroll down to **My Account Information**
3. Copy your **API Username** (User ID) - looks like: `12345678-1234-1234-1234-123456789012`

## Step 6: Grant User Consent (CRITICAL STEP)

**This is the most common cause of authentication failures!**

### Option A: Use Consent URL
1. Replace `{INTEGRATION_KEY}` with your actual Integration Key in this URL:
```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=f92510aa-2093-4f8b-997a-78db5abb3fcd&redirect_uri=https://developers.docusign.com/platform/auth/consent
```
2. Visit the URL in your browser
3. Log in with your DocuSign developer account
4. Click **Accept** to grant consent

### Option B: Use Apps & Keys Page
1. Go to **Apps & Keys** in your developer account
2. Find your app
3. Click **Actions** → **Grant Consent**

## Step 7: Configure Environment Variables

Add these to your `.env.local` file:

```env
# DocuSign Configuration
DOCUSIGN_INTEGRATION_KEY=your_integration_key_here
DOCUSIGN_USER_ID=your_user_id_here
DOCUSIGN_ACCOUNT_ID=your_account_id_here
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT_HERE\n-----END RSA PRIVATE KEY-----"
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
```

**Important Notes:**
- Replace `\n` with actual newlines in the private key
- Keep the quotes around the private key
- Use `https://demo.docusign.net/restapi` for sandbox/demo
- Use `https://na1.docusign.net/restapi` for production (adjust region as needed)

## Step 8: Test Authentication

1. Start your development server: `npm run dev`
2. Visit: `http://localhost:3000/api/docusign/test-auth`
3. Check the response and server console for detailed logs

## Common Issues & Solutions

### Issue: "invalid_client" Error
- **Cause**: Wrong Integration Key or User ID
- **Solution**: Double-check your Integration Key and User ID from Apps & Keys page

### Issue: "invalid_grant" Error
- **Cause**: Wrong private key format or user consent not granted
- **Solutions**: 
  1. Verify private key format (including `\n` for newlines)
  2. Grant user consent (Step 6)

### Issue: "consent_required" Error
- **Cause**: User consent not granted
- **Solution**: Complete Step 6 (Grant User Consent)

### Issue: "unauthorized" Error
- **Cause**: Wrong base path or account not activated
- **Solution**: 
  1. Verify `DOCUSIGN_BASE_PATH` matches your account type
  2. Ensure your developer account is activated

## Testing Checklist

- [ ] Developer account created and verified
- [ ] Integration app created
- [ ] RSA key pair generated
- [ ] User consent granted
- [ ] Environment variables configured
- [ ] Test endpoint returns success
- [ ] Database migration applied (DocuSign fields added to loans table)

## Next Steps

Once authentication is working:
1. Test creating a DocuSign envelope from a loan detail page
2. Set up webhook endpoint for status updates
3. Test the complete signature workflow

## Support

If you continue having issues:
1. Check the server console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure user consent has been granted
4. Contact DocuSign Support if needed
