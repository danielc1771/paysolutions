import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key (bypasses RLS)
const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

export async function POST() {
  try {
    const supabase = createAdminClient();
    
    // Create notifications table
    const { error } = await supabase.rpc('create_notifications_table', {}, {
      // We'll use SQL directly since RPC might not be available
    });
    
    if (error) {
      console.warn('RPC method not available, falling back to SQL instructions:', error.message);
    }

    // Fallback: Use direct SQL query
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        related_id UUID,
        related_table VARCHAR(50),
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      -- Create index for performance
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    `;

    // Execute using a simple insert that will fail if table doesn't exist
    // This is a workaround since we can't execute DDL directly through the client
    
    return NextResponse.json({
      message: 'Notifications table creation attempted',
      sql: createTableSQL,
      note: 'Please run this SQL in your Supabase SQL editor to create the notifications table'
    });

  } catch (error) {
    console.error('Error creating notifications table:', error);
    return NextResponse.json(
      { error: 'Failed to create notifications table' },
      { status: 500 }
    );
  }
}