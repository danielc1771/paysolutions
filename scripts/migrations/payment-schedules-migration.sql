-- Create payment_schedules table to store loan payment schedules
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal_amount DECIMAL(10,2) NOT NULL,
  interest_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  remaining_balance DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_date TIMESTAMP WITH TIME ZONE,
  stripe_payment_intent_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_schedules_loan_id ON payment_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);

-- Add new columns to loans table for Stripe subscription schedule tracking
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS stripe_subscription_schedule_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_schedules_updated_at
  BEFORE UPDATE ON payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_schedules_updated_at();
