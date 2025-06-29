const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Source database credentials
const sourceUrl = 'https://lyhpvcskcmwcklrozrks.supabase.co';
const sourceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aHB2Y3NrY213Y2tscm96cmtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDI3NjA3NywiZXhwIjoyMDY1ODUyMDc3fQ.XjOHgcqN6K-0lpmTyTluJtJuZu5Yqv2sclQGIV9lQeY';

const supabase = createClient(sourceUrl, sourceKey);

async function exportData() {
  try {
    console.log('📤 Exporting data from source database...');
    
    const exportData = {
      borrowers: [],
      loans: [],
      payment_schedules: [],
      payments: []
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
    
    // Save to file
    const exportFile = 'exported-data.json';
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`💾 Data exported to ${exportFile}`);
    
    // Create summary
    console.log('\n📊 Export Summary:');
    console.log(`- Borrowers: ${exportData.borrowers.length}`);
    console.log(`- Loans: ${exportData.loans.length}`);
    console.log(`- Payment Schedules: ${exportData.payment_schedules.length}`);
    console.log(`- Payments: ${exportData.payments.length}`);
    
    return exportData;
    
  } catch (error) {
    console.error('❌ Data export failed:', error);
  }
}

exportData();