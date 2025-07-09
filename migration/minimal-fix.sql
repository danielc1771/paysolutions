-- Minimal Fix - Just create the bare minimum for admin dashboard
-- Run this in Supabase SQL Editor

-- Create organizations table (minimal)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL DEFAULT 'Default Organization',
    email VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table (minimal)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'borrower',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default organization
INSERT INTO public.organizations (name, email) 
VALUES ('PaySolutions Default', 'admin@paysolutions.com')
ON CONFLICT (email) DO NOTHING;

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create basic policies
DROP POLICY IF EXISTS "Enable all operations for service role" ON public.organizations;
DROP POLICY IF EXISTS "Enable all operations for service role" ON public.profiles;

CREATE POLICY "Enable all operations for service role" ON public.organizations FOR ALL USING (true);
CREATE POLICY "Enable all operations for service role" ON public.profiles FOR ALL USING (true);