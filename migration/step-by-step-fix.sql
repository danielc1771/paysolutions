-- Step-by-Step Migration to Fix Admin Dashboard
-- Run this in Supabase SQL Editor

-- Step 1: Create organizations table with simple VARCHAR column
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    contact_person VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'trial',
    subscription_start_date DATE,
    subscription_end_date DATE,
    monthly_loan_limit INTEGER DEFAULT 10,
    total_users_limit INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create organization_settings table
CREATE TABLE IF NOT EXISTS public.organization_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    max_loan_amount DECIMAL(12,2) DEFAULT 50000.00,
    min_loan_amount DECIMAL(12,2) DEFAULT 1000.00,
    default_interest_rate DECIMAL(5,4) DEFAULT 0.0500,
    max_term_months INTEGER DEFAULT 60,
    require_collateral BOOLEAN DEFAULT false,
    auto_approve_threshold DECIMAL(12,2) DEFAULT 10000.00,
    settings_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- Step 3: Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'borrower',
    organization_id UUID REFERENCES public.organizations(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Add columns to existing tables (only if they don't exist)
DO $$ 
BEGIN
    -- Add organization_id to borrowers
    BEGIN
        ALTER TABLE public.borrowers ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column organization_id already exists in borrowers table';
    END;
    
    -- Add address_line2 to borrowers
    BEGIN
        ALTER TABLE public.borrowers ADD COLUMN address_line2 VARCHAR(255);
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column address_line2 already exists in borrowers table';
    END;
    
    -- Add employer_name to borrowers
    BEGIN
        ALTER TABLE public.borrowers ADD COLUMN employer_name VARCHAR(255);
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column employer_name already exists in borrowers table';
    END;
    
    -- Add kyc_verified_at to borrowers
    BEGIN
        ALTER TABLE public.borrowers ADD COLUMN kyc_verified_at TIMESTAMP WITH TIME ZONE;
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column kyc_verified_at already exists in borrowers table';
    END;
    
    -- Add current_employer_name to borrowers
    BEGIN
        ALTER TABLE public.borrowers ADD COLUMN current_employer_name VARCHAR(255);
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column current_employer_name already exists in borrowers table';
    END;
    
    -- Add organization_id to loans
    BEGIN
        ALTER TABLE public.loans ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column organization_id already exists in loans table';
    END;
    
    -- Add vehicle_vin to loans
    BEGIN
        ALTER TABLE public.loans ADD COLUMN vehicle_vin VARCHAR(50);
    EXCEPTION
        WHEN duplicate_column THEN
            RAISE NOTICE 'Column vehicle_vin already exists in loans table';
    END;
END $$;

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_email ON public.organizations(email);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON public.organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_borrowers_organization_id ON public.borrowers(organization_id);
CREATE INDEX IF NOT EXISTS idx_loans_organization_id ON public.loans(organization_id);

-- Step 6: Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Enable all operations for service role" ON public.organizations;
DROP POLICY IF EXISTS "Enable all operations for service role" ON public.organization_settings;
DROP POLICY IF EXISTS "Enable all operations for service role" ON public.profiles;

CREATE POLICY "Enable all operations for service role" ON public.organizations FOR ALL USING (true);
CREATE POLICY "Enable all operations for service role" ON public.organization_settings FOR ALL USING (true);
CREATE POLICY "Enable all operations for service role" ON public.profiles FOR ALL USING (true);

-- Step 8: Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 9: Add triggers (drop existing ones first)
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS update_organization_settings_updated_at ON public.organization_settings;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_settings_updated_at BEFORE UPDATE ON public.organization_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Insert default data
INSERT INTO public.organizations (
    name, 
    email, 
    contact_person, 
    subscription_status, 
    subscription_start_date, 
    subscription_end_date,
    monthly_loan_limit,
    total_users_limit
) VALUES (
    'PaySolutions Admin', 
    'admin@paysolutions.com', 
    'System Administrator', 
    'active', 
    CURRENT_DATE, 
    CURRENT_DATE + INTERVAL '1 year',
    1000,
    100
) ON CONFLICT (email) DO NOTHING;

-- Step 11: Create default organization settings
INSERT INTO public.organization_settings (
    organization_id,
    max_loan_amount,
    min_loan_amount,
    default_interest_rate,
    max_term_months,
    require_collateral,
    auto_approve_threshold
) 
SELECT 
    id,
    100000.00,
    1000.00,
    0.0500,
    60,
    false,
    25000.00
FROM public.organizations 
WHERE email = 'admin@paysolutions.com'
ON CONFLICT (organization_id) DO NOTHING;

-- Step 12: Update existing data to reference default organization
UPDATE public.borrowers 
SET organization_id = (
    SELECT id FROM public.organizations WHERE email = 'admin@paysolutions.com'
) 
WHERE organization_id IS NULL;

UPDATE public.loans 
SET organization_id = (
    SELECT id FROM public.organizations WHERE email = 'admin@paysolutions.com'
) 
WHERE organization_id IS NULL;

-- Step 13: Add sample organizations
INSERT INTO public.organizations (
    name, 
    email, 
    contact_person, 
    subscription_status, 
    subscription_start_date, 
    subscription_end_date,
    monthly_loan_limit,
    total_users_limit
) VALUES 
(
    'Demo Financial Services', 
    'demo@financialservices.com', 
    'John Smith', 
    'active', 
    CURRENT_DATE, 
    CURRENT_DATE + INTERVAL '6 months',
    50,
    10
),
(
    'Beta Credit Union', 
    'beta@creditunion.com', 
    'Sarah Johnson', 
    'trial', 
    CURRENT_DATE, 
    CURRENT_DATE + INTERVAL '1 month',
    20,
    5
)
ON CONFLICT (email) DO NOTHING;

-- Step 14: Create settings for sample organizations
INSERT INTO public.organization_settings (
    organization_id,
    max_loan_amount,
    min_loan_amount,
    default_interest_rate,
    max_term_months,
    require_collateral,
    auto_approve_threshold
) 
SELECT 
    id,
    75000.00,
    2000.00,
    0.0625,
    48,
    true,
    15000.00
FROM public.organizations 
WHERE email IN ('demo@financialservices.com', 'beta@creditunion.com')
ON CONFLICT (organization_id) DO NOTHING;