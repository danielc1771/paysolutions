import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authenticateWithJWT } from '@/utils/docusign/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: envelopeId } = params;

    if (!envelopeId) {
      return NextResponse.json({ error: 'Envelope ID is required' }, { status: 400 });
    }

    console.log('🔍 Getting DocuSign envelope view for:', envelopeId);

    // Get loan data to verify envelope exists
    const supabase = await createClient();
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('docusign_envelope_id, borrower:borrowers(first_name, last_name, email)')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (loanError || !loan) {
      console.error('❌ Loan not found for envelope:', envelopeId);
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Use the existing JWT authentication
    const accessToken = await authenticateWithJWT();
    console.log('✅ DocuSign authentication successful');
    
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;
    const baseUrl = process.env.DOCUSIGN_BASE_PATH!;
    
    // Create a recipient view for admin viewing
    // This creates an authenticated, time-limited URL for viewing the envelope
    const recipientViewRequest = {
      authenticationMethod: 'none',
      email: 'admin@paysolutions.com',
      userName: 'PaySolutions Admin',
      returnUrl: `${process.env.NEXTAUTH_URL}/admin/loans`,
      clientUserId: `admin-${Date.now()}` // Unique client user ID
    };

    console.log('📋 Creating recipient view for envelope:', envelopeId);

    const response = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(recipientViewRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DocuSign recipient view error:', response.status, errorText);
      
      // Try console view as fallback for admin access
      console.log('🔄 Trying console view as fallback...');
      try {
        const consoleResponse = await fetch(`${baseUrl}/v2.1/accounts/${accountId}/views/console`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            envelopeId: envelopeId,
            returnUrl: `${process.env.NEXTAUTH_URL}/admin/loans`
          })
        });

        if (consoleResponse.ok) {
          const consoleData = await consoleResponse.json();
          console.log('✅ Console view created successfully');
          return NextResponse.json({
            success: true,
            viewUrl: consoleData.url,
            viewType: 'console'
          });
        } else {
          const consoleErrorText = await consoleResponse.text();
          console.error('❌ Console view also failed:', consoleResponse.status, consoleErrorText);
        }
      } catch (consoleError) {
        console.error('❌ Console view exception:', consoleError);
      }
      
      return NextResponse.json({ 
        error: `Failed to create DocuSign viewing URL: ${response.status} ${errorText}` 
      }, { status: 500 });
    }

    const data = await response.json();
    
    if (!data.url) {
      console.error('❌ No viewing URL returned from DocuSign');
      return NextResponse.json({ 
        error: 'No viewing URL returned from DocuSign' 
      }, { status: 500 });
    }

    console.log('✅ DocuSign recipient view created successfully');
    return NextResponse.json({
      success: true,
      viewUrl: data.url,
      viewType: 'recipient'
    });

  } catch (error) {
    console.error('❌ DocuSign envelope view error:', error);
    return NextResponse.json({
      error: 'Failed to get envelope view URL'
    }, { status: 500 });
  }
}
