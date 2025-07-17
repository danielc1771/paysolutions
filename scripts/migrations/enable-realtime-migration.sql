-- Enable Realtime for loans table - Production Migration
-- This script should be run in the Supabase SQL Editor

-- 1. Enable Realtime for loans table by adding it to the supabase_realtime publication
BEGIN;

-- Drop and recreate the supabase_realtime publication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;

-- Add the loans table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE loans;

-- 2. Set replica identity to FULL to receive old record values in UPDATE/DELETE events
ALTER TABLE loans REPLICA IDENTITY FULL;

-- 3. Grant necessary permissions for Realtime to work properly
-- The 'authenticated' role is used by Supabase Auth users
-- The 'anon' role is used for anonymous access
GRANT SELECT ON loans TO authenticated;
GRANT SELECT ON loans TO anon;

-- 4. Verify the current RLS policies are compatible with Realtime
-- These policies should already exist but let's ensure they're compatible
DROP POLICY IF EXISTS "Enable all operations for service role" ON loans;
CREATE POLICY "Enable all operations for service role"
ON loans FOR ALL
TO public
USING (true);

-- Add specific policies for Realtime subscriptions
DROP POLICY IF EXISTS "Enable realtime for authenticated users" ON loans;
CREATE POLICY "Enable realtime for authenticated users"
ON loans FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Enable realtime for anon users" ON loans;
CREATE POLICY "Enable realtime for anon users"
ON loans FOR SELECT
TO anon
USING (true);

COMMIT;

-- 5. Test the publication setup
-- This query should show the loans table in the publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 6. Verify replica identity is set correctly
SELECT schemaname, tablename, replica_identity
FROM pg_tables 
WHERE tablename = 'loans' AND schemaname = 'public';

-- Expected output:
-- schemaname | tablename | replica_identity
-- -----------+-----------+------------------
-- public     | loans     | f
-- (f = full, d = default, n = nothing, i = index)