-- Setup Test Accounts for Role-Based Development
-- Run this after updating the role enum to include 'borrower'

-- First, create additional test organizations
INSERT INTO organizations (id, name, created_at, updated_at) 
VALUES 
  ('cb758fa9-8ff5-498d-82a4-25a3f1c60f2f', 'Test Dealership 2', NOW(), NOW()),
  ('dc858fb0-8ff5-498d-82a4-25a3f1c60f3f', 'Admin Test Org', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Test Admin Account (can see all organizations)
-- Note: You'll need to create this user in Supabase Auth first, then update the profile
-- Email: admin.test@paysolutions.com
-- Password: TestAdmin123!
INSERT INTO profiles (id, organization_id, role, full_name, email, status)
VALUES 
  ('10e979cf-6ea9-45f4-ba41-19736fed9d0c', 'ba658ea8-9ff5-498d-82a4-25a3f1c60f1f', 'admin', 'Test Admin User', 'admin.test@paysolutions.com', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  full_name = 'Test Admin User',
  email = 'admin.test@paysolutions.com',
  status = 'ACTIVE';

-- Test User Account 1 (easycar organization)
-- Email: user1.test@easycar.com
-- Password: TestUser123!
INSERT INTO profiles (id, organization_id, role, full_name, email, status)
VALUES 
  ('bf1025ce-8ebb-4d3a-ad22-ceeebc8118db', 'ba658ea8-9ff5-498d-82a4-25a3f1c60f1f', 'user', 'Test User Easycar', 'user1.test@easycar.com', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
  organization_id = 'ba658ea8-9ff5-498d-82a4-25a3f1c60f1f',
  role = 'user',
  full_name = 'Test User Easycar',
  email = 'user1.test@easycar.com',
  status = 'ACTIVE';

-- Test User Account 2 (Test Dealership 2 organization)
-- Email: user2.test@dealership2.com
-- Password: TestUser123!
INSERT INTO profiles (id, organization_id, role, full_name, email, status)
VALUES 
  ('30f386db-e5f6-4c5f-85f6-97d58d5c29b9', 'cb758fa9-8ff5-498d-82a4-25a3f1c60f2f', 'user', 'Test User Dealership 2', 'user2.test@dealership2.com', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
  organization_id = 'cb758fa9-8ff5-498d-82a4-25a3f1c60f2f',
  role = 'user',
  full_name = 'Test User Dealership 2',
  email = 'user2.test@dealership2.com',
  status = 'ACTIVE';

-- Create test borrowers for testing borrower authentication
INSERT INTO borrowers (id, first_name, last_name, email, phone, organization_id, kyc_status, created_at, updated_at)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'John', 'Doe', 'borrower1.test@gmail.com', '555-0101', 'ba658ea8-9ff5-498d-82a4-25a3f1c60f1f', 'completed', NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'Jane', 'Smith', 'borrower2.test@gmail.com', '555-0102', 'cb758fa9-8ff5-498d-82a4-25a3f1c60f2f', 'completed', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  organization_id = EXCLUDED.organization_id,
  kyc_status = EXCLUDED.kyc_status;

-- Test Borrower Profiles (for authentication)
-- Email: borrower1.test@gmail.com
-- Password: TestBorrower123!
INSERT INTO profiles (id, organization_id, role, full_name, email, status)
VALUES 
  ('c1554035-c26e-4a42-9604-6bb88a0c62a4', 'ba658ea8-9ff5-498d-82a4-25a3f1c60f1f', 'borrower', 'John Doe', 'borrower1.test@gmail.com', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
  organization_id = 'ba658ea8-9ff5-498d-82a4-25a3f1c60f1f',
  role = 'borrower',
  full_name = 'John Doe',
  email = 'borrower1.test@gmail.com',
  status = 'ACTIVE';

-- Email: borrower2.test@gmail.com  
-- Password: TestBorrower123!
INSERT INTO profiles (id, organization_id, role, full_name, email, status)
VALUES 
  ('c1554035-c26e-4a42-9604-6bb88a0c62a4', 'cb758fa9-8ff5-498d-82a4-25a3f1c60f2f', 'borrower', 'Jane Smith', 'borrower2.test@gmail.com', 'ACTIVE')
ON CONFLICT (id) DO UPDATE SET
  organization_id = 'cb758fa9-8ff5-498d-82a4-25a3f1c60f2f',
  role = 'borrower',
  full_name = 'Jane Smith',
  email = 'borrower2.test@gmail.com',
  status = 'ACTIVE';

-- Create test loans for the borrowers
INSERT INTO loans (id, loan_number, borrower_id, principal_amount, interest_rate, term_months, monthly_payment, status, vehicle_year, vehicle_make, vehicle_model, vehicle_vin, organization_id, created_at, updated_at)
VALUES 
  ('88888888-8888-8888-8888-888888888888', 'LOAN-TEST-001', '44444444-4444-4444-4444-444444444444', 15000.00, 0.0899, 48, 375.00, 'active', '2020', 'Honda', 'Civic', '1HGBH41JXMN109186', 'ba658ea8-9ff5-498d-82a4-25a3f1c60f1f', NOW(), NOW()),
  ('99999999-9999-9999-9999-999999999999', 'LOAN-TEST-002', '55555555-5555-5555-5555-555555555555', 12000.00, 0.0799, 36, 375.00, 'application_completed', '2019', 'Toyota', 'Camry', '4T1BF1FK5KU000001', 'cb758fa9-8ff5-498d-82a4-25a3f1c60f2f', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  loan_number = EXCLUDED.loan_number,
  borrower_id = EXCLUDED.borrower_id,
  principal_amount = EXCLUDED.principal_amount,
  status = EXCLUDED.status;

-- Create payment schedules for the active loan
INSERT INTO payment_schedules (id, loan_id, payment_number, due_date, principal_amount, interest_amount, total_amount, remaining_balance, status, created_at, updated_at)
VALUES 
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-8888-8888-8888-888888888888', 1, CURRENT_DATE + INTERVAL '1 month', 262.64, 112.36, 375.00, 14625.00, 'pending', NOW(), NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '88888888-8888-8888-8888-888888888888', 2, CURRENT_DATE + INTERVAL '2 months', 264.60, 110.40, 375.00, 14360.40, 'pending', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;