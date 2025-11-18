-- Find the user ID for jgarcia@easycarus.com
SELECT id, full_name, email, organization_id 
FROM profiles 
WHERE email = 'jgarcia@easycarus.com';

-- Once you have the user ID, update the loan
-- Replace 'USER_ID_HERE' with the actual ID from the query above
UPDATE loans 
SET created_by = (SELECT id FROM profiles WHERE email = 'jgarcia@easycarus.com')
WHERE loan_number = 'LOAN-1763394584245';

-- Verify the update
SELECT 
  l.loan_number,
  l.created_by,
  p.full_name as creator_name,
  p.email as creator_email
FROM loans l
LEFT JOIN profiles p ON l.created_by = p.id
WHERE l.loan_number = 'LOAN-1763394584245';
