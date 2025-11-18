import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkToken } from '@/utils/docusign/jwt-client';

export async function POST(request: Request) {
  try {
    console.log('🟢 DocuSign download API called');
    
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    const body = await request.json();
    const { envelopeId, loanId } = body;

    console.log('📝 Request body:', { envelopeId, loanId });

    if (!envelopeId) {
      console.error('❌ No envelope ID provided');
      return NextResponse.json({ error: 'Envelope ID is required' }, { status: 400 });
    }

    // Verify user has access to this loan
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    console.log('👤 User profile:', { organization_id: profile?.organization_id, role: profile?.role });

    const isAdmin = profile?.role === 'admin';

    // Get loan to verify access
    let loanQuery = supabase
      .from('loans')
      .select('id, docusign_envelope_id, organization_id')
      .eq('docusign_envelope_id', envelopeId);

    if (loanId) {
      loanQuery = loanQuery.eq('id', loanId);
    }

    if (!isAdmin && profile?.organization_id) {
      loanQuery = loanQuery.eq('organization_id', profile.organization_id);
    }

    console.log('🔍 Querying loan with envelope ID:', envelopeId);

    const { data: loan, error: loanError } = await loanQuery.single();

    if (loanError || !loan) {
      console.error('❌ Loan not found or access denied:', loanError);
      return NextResponse.json({ error: 'Loan not found or access denied' }, { status: 403 });
    }

    console.log('✅ Loan found:', loan.id);

    // Get DocuSign credentials using existing JWT authentication
    const accountId = process.env.API_ACCOUNT_ID;
    const basePath = process.env.BASE_PATH;

    console.log('🔑 DocuSign config:', { 
      accountId: accountId ? '***' + accountId.slice(-4) : 'missing',
      basePath 
    });

    if (!accountId || !basePath) {
      console.error('❌ DocuSign credentials not configured');
      return NextResponse.json({ error: 'DocuSign not configured' }, { status: 500 });
    }

    // Get JWT access token using existing authentication
    console.log('🔑 Getting JWT access token...');
    const accessToken = await checkToken();
    console.log('✅ Access token obtained');

    // Build the DocuSign API URL for downloading the combined document
    const downloadUrl = `${basePath}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents/combined`;

    console.log('📡 Downloading document from DocuSign:', downloadUrl);
    
    // Download the combined document (all documents in one PDF)
    const docusignResponse = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/pdf',
      },
    });

    console.log('📡 DocuSign response status:', docusignResponse.status, docusignResponse.statusText);

    if (!docusignResponse.ok) {
      const errorText = await docusignResponse.text();
      console.error('❌ DocuSign API error:', docusignResponse.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to retrieve document from DocuSign',
        details: errorText || docusignResponse.statusText 
      }, { status: docusignResponse.status });
    }

    console.log('✅ PDF retrieved from DocuSign');

    // Convert to buffer
    const pdfBlob = await docusignResponse.blob();
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());

    console.log('✅ PDF buffer created, size:', pdfBuffer.length, 'bytes');

    // Return the PDF with appropriate headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="loan-contract-${envelopeId}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });

  } catch (error: unknown) {
    console.error('Error downloading DocuSign document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download document' },
      { status: 500 }
    );
  }
}
