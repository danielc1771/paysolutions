import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Create database schema in new Supabase project
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🏗️ Starting schema creation...');
    
    const supabase = await createClient();
    
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      return NextResponse.json({
        error: 'Failed to connect to new database',
        details: testError.message
      }, { status: 500 });
    }
    
    console.log('✅ Connected to new database successfully');
    
    // Create schema components one by one
    const schemaSteps = [
      {
        name: 'Enable Extensions',
        sql: `
          CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
          CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        `
      },
      {
        name: 'Create Borrowers Table',
        sql: `
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
        `
      },
      {
        name: 'Create Loans Table',
        sql: `
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
        `
      },
      {
        name: 'Create Indexes',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_borrowers_email ON public.borrowers(email);
          CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON public.loans(borrower_id);
          CREATE INDEX IF NOT EXISTS idx_loans_loan_number ON public.loans(loan_number);
          CREATE INDEX IF NOT EXISTS idx_loans_docusign_envelope_id ON public.loans(docusign_envelope_id);
          CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
        `
      }
    ];
    
    const results = [];
    
    for (const step of schemaSteps) {
      console.log(`🔧 Executing: ${step.name}`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: step.sql });
      
      if (error) {
        console.error(`❌ Failed: ${step.name}`, error);
        results.push({ step: step.name, success: false, error: error.message });
      } else {
        console.log(`✅ Completed: ${step.name}`);
        results.push({ step: step.name, success: true });
      }
    }
    
    const allSuccessful = results.every(r => r.success);
    
    if (allSuccessful) {
      console.log('🎉 Schema creation completed successfully!');
    } else {
      console.log('⚠️ Some schema steps failed');
    }
    
    return NextResponse.json({
      success: allSuccessful,
      message: allSuccessful ? 'Schema created successfully' : 'Some schema steps failed',
      results,
      next_step: allSuccessful ? 'Ready to import data' : 'Please check errors and retry'
    });
    
  } catch (error) {
    console.error('❌ Schema creation failed:', error);
    return NextResponse.json(
      { error: 'Failed to create schema', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}