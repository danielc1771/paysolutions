-- Add DocuSign tracking fields to loans table
ALTER TABLE loans ADD COLUMN IF NOT EXISTS docusign_envelope_id VARCHAR(255);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS docusign_status VARCHAR(50) DEFAULT 'not_sent';
ALTER TABLE loans ADD COLUMN IF NOT EXISTS docusign_status_updated TIMESTAMPTZ;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS docusign_completed_at TIMESTAMPTZ;

-- Add index for envelope lookups
CREATE INDEX IF NOT EXISTS idx_loans_docusign_envelope_id ON loans(docusign_envelope_id);

-- Add comments for documentation
COMMENT ON COLUMN loans.docusign_envelope_id IS 'DocuSign envelope ID for loan agreement';
COMMENT ON COLUMN loans.docusign_status IS 'Current status of DocuSign envelope (not_sent, sent, completed, declined, voided)';
COMMENT ON COLUMN loans.docusign_status_updated IS 'Timestamp when DocuSign status was last updated';
COMMENT ON COLUMN loans.docusign_completed_at IS 'Timestamp when DocuSign envelope was completed';
