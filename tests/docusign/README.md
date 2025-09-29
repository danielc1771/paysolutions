# DocuSign Test Files

This directory contains test files for DocuSign integration development and debugging.

## Files

- `test-authcode-grant.js` - Complete Authorization Code Grant flow test
- `test-final-integration.js` - Environment validation and setup verification
- `docusign-template-tabs-output.json` - Template tab structure reference

## Usage

These files are for development and testing purposes only. They help validate:

- OAuth Authorization Code Grant flow
- Environment variable configuration
- Template structure and tab mapping
- Token exchange and refresh

## Running Tests

```bash
# Test Authorization Code Grant flow
node tests/docusign/test-authcode-grant.js

# Validate environment setup
node tests/docusign/test-final-integration.js
```

## Note

These test files require proper environment variables to be set in `.env.local`.
