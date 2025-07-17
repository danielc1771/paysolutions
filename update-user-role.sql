-- Update user1.test@easycar.com to organization_owner role
-- This script should be run in your Supabase SQL Editor

UPDATE profiles 
SET role = 'organization_owner' 
WHERE email = 'user1.test@easycar.com';

-- Verify the update
SELECT 
    id,
    email,
    full_name,
    role,
    organization_id,
    status
FROM profiles 
WHERE email = 'user1.test@easycar.com';

-- Optional: Check all users in the easycar organization
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    o.name as organization_name,
    p.status
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
WHERE o.name = 'easycar'
ORDER BY p.role, p.email;