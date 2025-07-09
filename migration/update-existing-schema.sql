-- Update Existing Schema for Admin Dashboard
-- Run this in Supabase SQL Editor
-- Based on current database analysis

-- Step 1: Add missing columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS subscription_start_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS subscription_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '1 year',
ADD COLUMN IF NOT EXISTS monthly_loan_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS total_users_limit INTEGER DEFAULT 10;

-- Step 2: Update existing organizations with default values
UPDATE public.organizations 
SET 
    is_active = true,
    subscription_status = 'active',
    subscription_start_date = CURRENT_DATE,
    subscription_end_date = CURRENT_DATE + INTERVAL '1 year',
    monthly_loan_limit = 50,
    total_users_limit = 10
WHERE is_active IS NULL;

-- Step 3: Create organization_settings table
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

-- Step 4: Add default settings for existing organizations
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
ON CONFLICT (organization_id) DO NOTHING;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status ON public.organizations(subscription_status);

-- Step 6: Enable RLS on new table
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policy
CREATE POLICY "Enable all operations for service role" ON public.organization_settings FOR ALL USING (true);

-- Step 8: Create updated_at trigger for organization_settings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organization_settings_updated_at BEFORE UPDATE ON public.organization_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();