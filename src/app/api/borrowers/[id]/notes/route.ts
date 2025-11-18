import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';

// GET - Fetch all notes for a borrower
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🟢 GET /api/borrowers/[id]/notes - Starting');
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    // Get user's profile to check organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    console.log('👤 User profile:', { organization_id: profile?.organization_id, role: profile?.role });

    if (!profile?.organization_id && profile?.role !== 'admin') {
      console.error('❌ No organization found for user');
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    const { id: borrowerId } = await params;
    console.log('📝 Fetching notes for borrower:', borrowerId);

    // Use admin client for data operations (bypasses RLS)
    const adminSupabase = await createAdminClient();

    // Build query for notes
    let notesQuery = adminSupabase
      .from('borrower_notes')
      .select('id, note, created_at, updated_at, created_by, borrower_id, organization_id')
      .eq('borrower_id', borrowerId)
      .order('created_at', { ascending: false });

    // Filter by organization for non-admin users
    if (profile?.role !== 'admin') {
      notesQuery = notesQuery.eq('organization_id', profile.organization_id);
      console.log('🔒 Filtering by organization:', profile.organization_id);
    }

    const { data: notes, error: notesError } = await notesQuery;

    if (notesError) {
      console.error('❌ Error fetching notes:', notesError);
      return NextResponse.json({ error: 'Failed to fetch notes', details: notesError }, { status: 500 });
    }

    console.log('✅ Found notes:', notes?.length || 0);

    if (!notes || notes.length === 0) {
      return NextResponse.json({ notes: [] });
    }

    // Fetch creator names
    const creatorIds = [...new Set(notes.map(n => n.created_by))];
    console.log('👥 Fetching creator info for:', creatorIds.length, 'users');
    
    const { data: creators, error: creatorsError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', creatorIds);

    if (creatorsError) {
      console.error('⚠️ Error fetching creators:', creatorsError);
    }

    const creatorsMap = new Map(creators?.map(c => [c.id, c]) || []);

    const notesWithCreators = notes.map(note => ({
      id: note.id,
      note: note.note,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      createdBy: note.created_by,
      createdByName: creatorsMap.get(note.created_by)?.full_name || 'Unknown',
    }));

    console.log('✅ Returning notes with creator info');
    return NextResponse.json({ notes: notesWithCreators });
  } catch (error) {
    console.error('❌ Unexpected error fetching borrower notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// POST - Create a new note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🟢 POST /api/borrowers/[id]/notes - Starting');
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    // Get user's profile to check organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    console.log('👤 User profile:', { organization_id: profile?.organization_id, role: profile?.role });

    if (!profile?.organization_id && profile?.role !== 'admin') {
      console.error('❌ No organization found for user');
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }

    const { id: borrowerId } = await params;
    const { note } = await request.json();

    console.log('📝 Creating note for borrower:', borrowerId);

    if (!note || note.trim().length === 0) {
      console.error('❌ Note content is empty');
      return NextResponse.json({ error: 'Note content is required' }, { status: 400 });
    }

    // Verify borrower exists and belongs to organization (or user is admin)
    const { data: borrower, error: borrowerError } = await supabase
      .from('borrowers')
      .select('id, organization_id')
      .eq('id', borrowerId)
      .single();

    if (borrowerError || !borrower) {
      console.error('❌ Borrower not found:', borrowerError);
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 });
    }

    console.log('✅ Borrower found, organization:', borrower.organization_id);

    if (profile?.role !== 'admin' && borrower.organization_id !== profile.organization_id) {
      console.error('❌ Access denied - organization mismatch');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Use admin client for data operations (bypasses RLS)
    const adminSupabase = await createAdminClient();

    // Create the note using admin client
    const { data: newNote, error: insertError } = await adminSupabase
      .from('borrower_notes')
      .insert({
        borrower_id: borrowerId,
        organization_id: borrower.organization_id,
        created_by: user.id,
        note: note.trim(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting note:', insertError);
      return NextResponse.json({ error: 'Failed to create note', details: insertError }, { status: 500 });
    }

    console.log('✅ Note created successfully:', newNote.id);

    // Fetch creator name
    const creatorName = profile?.full_name || 'Unknown';

    return NextResponse.json({
      note: {
        id: newNote.id,
        note: newNote.note,
        createdAt: newNote.created_at,
        updatedAt: newNote.updated_at,
        createdBy: newNote.created_by,
        createdByName: creatorName,
      },
    });
  } catch (error) {
    console.error('❌ Unexpected error creating borrower note:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

// DELETE - Delete a note
export async function DELETE(request: NextRequest) {
  try {
    console.log('🟢 DELETE /api/borrowers/[id]/notes - Starting');
    
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    console.log('🗑️ Deleting note:', noteId);

    if (!noteId) {
      console.error('❌ Note ID is missing');
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    console.log('👤 User profile:', { organization_id: profile?.organization_id, role: profile?.role });

    // Use admin client for data operations (bypasses RLS)
    const adminSupabase = await createAdminClient();

    // Fetch the note to verify ownership
    const { data: note, error: noteError } = await adminSupabase
      .from('borrower_notes')
      .select('id, created_by, organization_id')
      .eq('id', noteId)
      .single();

    if (noteError || !note) {
      console.error('❌ Note not found:', noteError);
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    console.log('✅ Note found, created by:', note.created_by);

    // Only allow deletion if user created the note or is admin
    if (profile?.role !== 'admin' && note.created_by !== user.id) {
      console.error('❌ Access denied - user did not create this note');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete the note using admin client
    const { error: deleteError } = await adminSupabase
      .from('borrower_notes')
      .delete()
      .eq('id', noteId);

    if (deleteError) {
      console.error('❌ Error deleting note:', deleteError);
      return NextResponse.json({ error: 'Failed to delete note', details: deleteError }, { status: 500 });
    }

    console.log('✅ Note deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Unexpected error deleting borrower note:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
