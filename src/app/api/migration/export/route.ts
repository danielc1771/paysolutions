import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Export data from current database for migration
 */
export async function GET() {
  try {
    console.log('📤 Starting data export...');
    
    const supabase = await createClient();
    
    const exportData = {
      borrowers: [],
      loans: [],
      payment_schedules: [],
      payments: [],
      export_timestamp: new Date().toISOString()
    };
    
    // Export borrowers
    console.log('📋 Exporting borrowers...');
    const { data: borrowers, error: borrowersError } = await supabase
      .from('borrowers')
      .select('*')
      .order('created_at');
    
    if (borrowersError) {
      console.error('Error exporting borrowers:', borrowersError);
    } else {
      exportData.borrowers = borrowers || [];
      console.log(`✅ Exported ${exportData.borrowers.length} borrowers`);
    }
    
    // Export loans
    console.log('📋 Exporting loans...');
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*')
      .order('created_at');
    
    if (loansError) {
      console.error('Error exporting loans:', loansError);
    } else {
      exportData.loans = loans || [];
      console.log(`✅ Exported ${exportData.loans.length} loans`);
    }
    
    // Try to export payment_schedules (may not exist)
    console.log('📋 Exporting payment schedules...');
    const { data: paymentSchedules, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .order('created_at');
    
    if (schedulesError) {
      console.log('ℹ️ Payment schedules table not found or empty:', schedulesError.message);
    } else {
      exportData.payment_schedules = paymentSchedules || [];
      console.log(`✅ Exported ${exportData.payment_schedules.length} payment schedules`);
    }
    
    // Try to export payments (may not exist)
    console.log('📋 Exporting payments...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .order('created_at');
    
    if (paymentsError) {
      console.log('ℹ️ Payments table not found or empty:', paymentsError.message);
    } else {
      exportData.payments = payments || [];
      console.log(`✅ Exported ${exportData.payments.length} payments`);
    }
    
    console.log('\n📊 Export Summary:');
    console.log(`- Borrowers: ${exportData.borrowers.length}`);
    console.log(`- Loans: ${exportData.loans.length}`);
    console.log(`- Payment Schedules: ${exportData.payment_schedules.length}`);
    console.log(`- Payments: ${exportData.payments.length}`);
    
    return NextResponse.json({
      success: true,
      message: 'Data exported successfully',
      data: exportData,
      summary: {
        borrowers: exportData.borrowers.length,
        loans: exportData.loans.length,
        payment_schedules: exportData.payment_schedules.length,
        payments: exportData.payments.length,
        export_timestamp: exportData.export_timestamp
      }
    });
    
  } catch (error) {
    console.error('❌ Data export failed:', error);
    return NextResponse.json(
      { error: 'Failed to export data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}