const { createClient } = require('@supabase/supabase-js');

// Source database credentials
const sourceUrl = 'https://lyhpvcskcmwcklrozrks.supabase.co';
const sourceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5aHB2Y3NrY213Y2tscm96cmtzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDI3NjA3NywiZXhwIjoyMDY1ODUyMDc3fQ.XjOHgcqN6K-0lpmTyTluJtJuZu5Yqv2sclQGIV9lQeY';

const supabase = createClient(sourceUrl, sourceKey);

async function extractSchema() {
  try {
    console.log('🔍 Extracting database schema from source...');
    
    // Get all tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .not('table_name', 'like', '%_realtime%')
      .not('table_name', 'eq', 'schema_migrations');
    
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return;
    }
    
    console.log('📋 Found tables:', tables.map(t => t.table_name));
    
    // Get table structures
    for (const table of tables) {
      console.log(`\n🔧 Analyzing table: ${table.table_name}`);
      
      // Get columns
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name)
        .order('ordinal_position');
      
      if (columnsError) {
        console.error(`Error fetching columns for ${table.table_name}:`, columnsError);
        continue;
      }
      
      console.log(`  Columns:`, columns.map(c => `${c.column_name} (${c.data_type})`));
    }
    
    console.log('\n✅ Schema extraction completed');
    
  } catch (error) {
    console.error('❌ Schema extraction failed:', error);
  }
}

extractSchema();