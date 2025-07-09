import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Import data from exported JSON to new database
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📥 Starting data import...');
    
    const { data: importData } = await request.json();
    
    if (!importData) {
      return NextResponse.json({ error: 'No data provided for import' }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    const results = {
      borrowers: { success: false, count: 0, error: null as string | null },
      loans: { success: false, count: 0, error: null as string | null },
      payment_schedules: { success: false, count: 0, error: null as string | null },
      payments: { success: false, count: 0, error: null as string | null }
    };
    
    // Import borrowers first (since loans reference them)
    if (importData.borrowers && importData.borrowers.length > 0) {
      console.log(`📋 Importing ${importData.borrowers.length} borrowers...`);
      
      const { error: borrowersError } = await supabase
        .from('borrowers')
        .insert(importData.borrowers);
      
      if (borrowersError) {
        console.error('❌ Borrowers import failed:', borrowersError);
        results.borrowers.error = borrowersError.message;
      } else {
        console.log(`✅ Imported ${importData.borrowers.length} borrowers`);
        results.borrowers.success = true;
        results.borrowers.count = importData.borrowers.length;
      }
    }
    
    // Import loans
    if (importData.loans && importData.loans.length > 0) {
      console.log(`📋 Importing ${importData.loans.length} loans...`);
      
      const { error: loansError } = await supabase
        .from('loans')
        .insert(importData.loans);
      
      if (loansError) {
        console.error('❌ Loans import failed:', loansError);
        results.loans.error = loansError.message;
      } else {
        console.log(`✅ Imported ${importData.loans.length} loans`);
        results.loans.success = true;
        results.loans.count = importData.loans.length;
      }
    }
    
    // Import payment schedules (if any)
    if (importData.payment_schedules && importData.payment_schedules.length > 0) {
      console.log(`📋 Importing ${importData.payment_schedules.length} payment schedules...`);
      
      const { error: schedulesError } = await supabase
        .from('payment_schedules')
        .insert(importData.payment_schedules);
      
      if (schedulesError) {
        console.error('❌ Payment schedules import failed:', schedulesError);
        results.payment_schedules.error = schedulesError.message;
      } else {
        console.log(`✅ Imported ${importData.payment_schedules.length} payment schedules`);
        results.payment_schedules.success = true;
        results.payment_schedules.count = importData.payment_schedules.length;
      }
    }
    
    // Import payments (if any)
    if (importData.payments && importData.payments.length > 0) {
      console.log(`📋 Importing ${importData.payments.length} payments...`);
      
      const { error: paymentsError } = await supabase
        .from('payments')
        .insert(importData.payments);
      
      if (paymentsError) {
        console.error('❌ Payments import failed:', paymentsError);
        results.payments.error = paymentsError.message;
      } else {
        console.log(`✅ Imported ${importData.payments.length} payments`);
        results.payments.success = true;
        results.payments.count = importData.payments.length;
      }
    }
    
    const overallSuccess = results.borrowers.success && results.loans.success;
    
    console.log('\n📊 Import Summary:');
    console.log(`- Borrowers: ${results.borrowers.success ? '✅' : '❌'} ${results.borrowers.count}`);
    console.log(`- Loans: ${results.loans.success ? '✅' : '❌'} ${results.loans.count}`);
    console.log(`- Payment Schedules: ${results.payment_schedules.success ? '✅' : '❌'} ${results.payment_schedules.count}`);
    console.log(`- Payments: ${results.payments.success ? '✅' : '❌'} ${results.payments.count}`);
    
    return NextResponse.json({
      success: overallSuccess,
      message: overallSuccess ? 'Data imported successfully' : 'Some data imports failed',
      results,
      next_step: overallSuccess ? 'Ready to test application' : 'Please check errors and retry'
    });
    
  } catch (error) {
    console.error('❌ Data import failed:', error);
    return NextResponse.json(
      { error: 'Failed to import data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}