-- PaySolutions Schema Update: Add Organizations and Role Management (FIXED)
-- Date: 2025-07-08
-- Description: Add organizations table, update roles, and set up organization relationships

-- Create role enum type
DO $$ BEGIN
    CREATE TYPE public.role AS ENUM ('admin', 'organization_owner', 'team_member', 'borrower');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create subscription status enum
DO $$ BEGIN
    CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'suspended', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    contact_person VARCHAR(255),
    subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),
    subscription_start_date DATE,
    subscription_end_date DATE,
    monthly_loan_limit INTEGER DEFAULT 10,
    total_users_limit INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_settings table
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

-- Create profiles table (users table)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(20) DEFAULT 'borrower' CHECK (role IN ('admin', 'organization_owner', 'team_member', 'borrower')),
    organization_id UUID REFERENCES public.organizations(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add organization_id to existing tables
DO $$ BEGIN
    ALTER TABLE public.borrowers ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.borrowers ADD COLUMN address_line2 VARCHAR(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.borrowers ADD COLUMN employer_name VARCHAR(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.borrowers ADD COLUMN kyc_verified_at TIMESTAMP WITH TIME ZONE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.borrowers ADD COLUMN current_employer_name VARCHAR(255);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.loans ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.loans ADD COLUMN vehicle_vin VARCHAR(50);
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_email ON public.organizations(email);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON public.organizations(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_borrowers_organization_id ON public.borrowers(organization_id);
CREATE INDEX IF NOT EXISTS idx_loans_organization_id ON public.loans(organization_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ BEGIN
    CREATE POLICY "Enable all operations for service role" ON public.organizations FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all operations for service role" ON public.organization_settings FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all operations for service role" ON public.profiles FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DO $$ BEGIN
    CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_organization_settings_updated_at BEFORE UPDATE ON public.organization_settings 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Insert default admin organization
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

-- Create default organization settings
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

-- Update existing data to reference default organization
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

-- Create a function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'borrower');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add some sample organizations for testing
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

-- Create default settings for sample organizations
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