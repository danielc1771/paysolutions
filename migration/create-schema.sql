-- PaySolutions Database Schema Migration
-- Source: https://lyhpvcskcmwcklrozrks.supabase.co
-- Target: https://mrbsllbyiiknsjohqwph.supabase.co

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create borrowers table
CREATE TABLE IF NOT EXISTS public.borrowers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    employment_status VARCHAR(50),
    annual_income DECIMAL(12,2),
    kyc_status VARCHAR(50) DEFAULT 'pending',
    ssn VARCHAR(11),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create loans table
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_number VARCHAR(50) UNIQUE NOT NULL,
    borrower_id UUID REFERENCES public.borrowers(id) ON DELETE CASCADE,
    principal_amount DECIMAL(12,2) NOT NULL,
    interest_rate DECIMAL(5,4) NOT NULL,
    term_months INTEGER NOT NULL,
    monthly_payment DECIMAL(10,2) NOT NULL,
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'new',
    funding_date DATE,
    remaining_balance DECIMAL(12,2),
    
    -- DocuSign integration fields
    docusign_envelope_id VARCHAR(255),
    docusign_status VARCHAR(50) DEFAULT 'not_sent',
    docusign_status_updated TIMESTAMP WITH TIME ZONE,
    docusign_completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_schedules table (if exists)
CREATE TABLE IF NOT EXISTS public.payment_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
    payment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    principal_amount DECIMAL(10,2) NOT NULL,
    interest_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    remaining_balance DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    paid_date DATE,
    paid_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table (if exists)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
    payment_schedule_id UUID REFERENCES public.payment_schedules(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    stripe_payment_intent_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_borrowers_email ON public.borrowers(email);
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON public.loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_loans_loan_number ON public.loans(loan_number);
CREATE INDEX IF NOT EXISTS idx_loans_docusign_envelope_id ON public.loans(docusign_envelope_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_loan_id ON public.payment_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON public.payments(loan_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic - you may need to adjust based on your auth requirements)
CREATE POLICY "Enable all operations for service role" ON public.borrowers FOR ALL USING (true);
CREATE POLICY "Enable all operations for service role" ON public.loans FOR ALL USING (true);
CREATE POLICY "Enable all operations for service role" ON public.payment_schedules FOR ALL USING (true);
CREATE POLICY "Enable all operations for service role" ON public.payments FOR ALL USING (true);

-- Add any additional constraints
ALTER TABLE public.loans ADD CONSTRAINT check_positive_amounts CHECK (
    principal_amount > 0 AND 
    interest_rate >= 0 AND 
    term_months > 0 AND 
    monthly_payment > 0
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_borrowers_updated_at BEFORE UPDATE ON public.borrowers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_schedules_updated_at BEFORE UPDATE ON public.payment_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();