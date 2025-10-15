-- Migration: Add DocuSign signer email columns to loans table
-- Purpose: Store the exact emails used during envelope creation to ensure
--          recipient view URLs use matching emails (prevents UNKNOWN_ENVELOPE_RECIPIENT error)

ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS docusign_ipay_email TEXT,
ADD COLUMN IF NOT EXISTS docusign_org_email TEXT,
ADD COLUMN IF NOT EXISTS docusign_org_name TEXT,
ADD COLUMN IF NOT EXISTS docusign_borrower_email TEXT;

-- Add helpful comments
COMMENT ON COLUMN loans.docusign_ipay_email IS 'iPay email used when creating DocuSign envelope - must match for recipient view';
COMMENT ON COLUMN loans.docusign_org_email IS 'Organization email used when creating DocuSign envelope - must match for recipient view';
COMMENT ON COLUMN loans.docusign_org_name IS 'Organization name used when creating DocuSign envelope';
COMMENT ON COLUMN loans.docusign_borrower_email IS 'Borrower email used when creating DocuSign envelope - must match for recipient view';
