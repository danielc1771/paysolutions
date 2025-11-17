# DocuSign Private Key Setup

## Security Notice
⚠️ **NEVER commit your DocuSign private key to version control!**

The private key is now stored securely as an environment variable instead of a file.

## Setup Instructions

### Local Development

**Option 1: Environment Variable (Recommended)**
1. Copy your DocuSign RSA private key content
2. Add to your `.env.local` file:
```bash
DOCUSIGN_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
YOUR_PRIVATE_KEY_CONTENT_HERE
-----END RSA PRIVATE KEY-----"
```

**Option 2: File (Fallback)**
1. Place your `private.key` file in the project root
2. The file is already in `.gitignore` and won't be committed

### Production (Vercel/Netlify/etc.)

1. Go to your deployment platform's environment variables settings
2. Add a new environment variable:
   - **Name**: `DOCUSIGN_PRIVATE_KEY`
   - **Value**: Your complete RSA private key (including header/footer)
   
   ```
   -----BEGIN RSA PRIVATE KEY-----
   MIIEpAIBAAKCAQEA...
   ...your key content...
   ...
   -----END RSA PRIVATE KEY-----
   ```

3. Make sure to preserve all line breaks in the key

### How to Get Your Private Key

1. Log into DocuSign Admin
2. Go to **Apps and Keys**
3. Find your integration
4. Click **Actions** → **Edit**
5. Under **Service Integration**, generate or download your RSA keypair
6. Copy the **Private Key** content

### Verifying Setup

The application will:
- ✅ First try to use `DOCUSIGN_PRIVATE_KEY` environment variable
- ⚠️ Fall back to `private.key` file (local dev only)
- ❌ Throw an error if neither is found

### Other Required DocuSign Environment Variables

Make sure you also have these set:
```bash
INTEGRATION_KEY=your_integration_key
USER_ID=your_user_id
API_ACCOUNT_ID=your_account_id
BASE_PATH=https://demo.docusign.net/restapi
TEMPLATE_ID=your_template_id
```

## Security Best Practices

1. ✅ Use environment variables in production
2. ✅ Keep `private.key` in `.gitignore`
3. ✅ Rotate keys periodically
4. ✅ Use different keys for dev/staging/production
5. ❌ Never commit keys to git
6. ❌ Never share keys in chat/email
7. ❌ Never log the full key content

## If Private Key Was Committed

If you accidentally committed the private key:

1. **Immediately rotate the key** in DocuSign Admin
2. Remove from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch private.key" \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. Force push (⚠️ coordinate with team):
   ```bash
   git push origin --force --all
   ```
4. Update all environments with the new key
