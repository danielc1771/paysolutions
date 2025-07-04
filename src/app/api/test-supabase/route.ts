import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:');
    console.log('- SUPABASE_URL exists:', !!supabaseUrl);
    console.log('- ANON_KEY exists:', !!anonKey);
    console.log('- SERVICE_KEY exists:', !!serviceKey);
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasAnonKey: !!anonKey,
          hasServiceKey: !!serviceKey
        }
      });
    }

    // Test service role connection
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Test basic query
    const { data, error } = await supabase
      .from('borrowers')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({
        success: false,
        error: 'Database query failed',
        details: error
      });
    }

    // Test if tables exist
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_info');
    
    console.log('Available tables:', tables);

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful!',
      borrowersCount: data?.length || 0,
      tablesError: tablesError?.message || null
    });

  } catch (error) {
    console.error('Connection test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error
    });
  }
}
