-- Update Loan Numbers to Sequential Format
-- Run this in Supabase SQL Editor

-- Create a sequence for loan numbers
CREATE SEQUENCE IF NOT EXISTS loan_number_seq START 1;

-- Create a function to generate loan numbers
CREATE OR REPLACE FUNCTION generate_loan_number() RETURNS TEXT AS $$
BEGIN
    RETURN 'LOAN-' || LPAD(nextval('loan_number_seq')::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Update existing loans with sequential numbers
WITH numbered_loans AS (
    SELECT 
        id,
        'LOAN-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0') AS new_loan_number
    FROM loans
    ORDER BY created_at
)
UPDATE loans 
SET loan_number = numbered_loans.new_loan_number
FROM numbered_loans
WHERE loans.id = numbered_loans.id;

-- Reset the sequence to continue from the highest existing number
SELECT setval('loan_number_seq', (SELECT COUNT(*) FROM loans));

-- Create a trigger to auto-generate loan numbers for new loans
CREATE OR REPLACE FUNCTION set_loan_number() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.loan_number IS NULL OR NEW.loan_number = '' THEN
        NEW.loan_number := generate_loan_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_loan_number ON loans;

-- Create trigger for new loans
CREATE TRIGGER auto_loan_number
    BEFORE INSERT ON loans
    FOR EACH ROW
    EXECUTE FUNCTION set_loan_number();