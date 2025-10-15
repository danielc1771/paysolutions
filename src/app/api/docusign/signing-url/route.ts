import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getEnvelopesApi, makeRecipientViewRequest } from '@/utils/docusign/jwt-client';

const DEFAULT_IPAY_EMAIL = 'ipaycustomer@gmail.com'; // iPay's official email - always stays the same
const INTEGRATION_KEY = process.env.INTEGRATION_KEY || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * POST /api/docusign/signing-url
 *
 * Generate a fresh signing URL for a specific signer (valid for 5 minutes)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId, signerType } = body;

    if (!loanId || !signerType) {
      return NextResponse.json({
        success: false,
        error: 'Missing loanId or signerType'
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch loan with envelope ID
    // We use stored DocuSign emails to ensure exact match with envelope creation
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({
        success: false,
        error: 'Loan not found'
      }, { status: 404 });
    }

    if (!loan.docusign_envelope_id) {
      return NextResponse.json({
        success: false,
        error: 'No DocuSign envelope found for this loan'
      }, { status: 400 });
    }

    const envelopesApi = await getEnvelopesApi();
    const returnUrl = `${BASE_URL}/docusign-complete?event=signing_complete&loanId=${loanId}&signerType=${signerType}&envelopeId=${loan.docusign_envelope_id}`;

    // iPay and Organization use recipient view (embedded signing)
    // Borrower uses email-based signing
    let signerEmail = '';
    let signerName = '';
    let clientUserId = '';

    switch (signerType) {
      case 'ipay':
        // Use stored iPay email from envelope creation (ensures exact match)
        signerEmail = loan.docusign_ipay_email || DEFAULT_IPAY_EMAIL;
        signerName = 'iPay Representative';
        clientUserId = `${INTEGRATION_KEY}-ipay`;
        console.log('🔍 iPay signer details:', { 
          signerEmail, 
          signerName, 
          clientUserId,
          storedEmail: loan.docusign_ipay_email 
        });
        break;
      case 'organization':
        // Use stored organization email from envelope creation (MUST match exactly)
        console.log('🔍 Stored DocuSign organization data:', {
          storedOrgEmail: loan.docusign_org_email,
          storedOrgName: loan.docusign_org_name
        });
        
        if (!loan.docusign_org_email) {
          return NextResponse.json({
            success: false,
            error: 'Organization email not found in envelope data. Please recreate the envelope.'
          }, { status: 400 });
        }
        signerEmail = loan.docusign_org_email;
        signerName = loan.docusign_org_name || 'Organization Representative';
        clientUserId = `${INTEGRATION_KEY}-organization`;
        console.log('🔍 Organization signer details:', { signerEmail, signerName, clientUserId });
        break;
      case 'borrower':
        // Use stored borrower email from envelope creation
        if (!loan.docusign_borrower_email) {
          return NextResponse.json({
            success: false,
            error: 'Borrower email not found in envelope data.'
          }, { status: 400 });
        }
        
        // Fetch borrower name for display
        const { data: borrower } = await supabase
          .from('borrowers')
          .select('first_name, last_name')
          .eq('id', loan.borrower_id)
          .single();

        signerEmail = loan.docusign_borrower_email;
        signerName = borrower ? `${borrower.first_name} ${borrower.last_name}` : 'Borrower';
        // Borrower signs via email, not embedded
        return NextResponse.json({
          success: false,
          error: 'Borrower signs via email link, not embedded view.'
        }, { status: 400 });
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid signer type'
        }, { status: 400 });
    }

    // Create recipient view request for iPay and organization
    const viewRequest = makeRecipientViewRequest(signerName, signerEmail, clientUserId, returnUrl);

    console.log(`📝 Creating recipient view for ${signerType}:`, {
      envelopeId: loan.docusign_envelope_id,
      signerEmail,
      signerName,
      clientUserId
    });

    try {
      const result = await envelopesApi.createRecipientView(
        process.env.API_ACCOUNT_ID!,
        loan.docusign_envelope_id,
        { recipientViewRequest: viewRequest }
      );

      const signingUrl = result.url;

      console.log(`✅ Recipient view URL generated for ${signerType}`);

      return NextResponse.json({
        success: true,
        signingUrl
      });
    } catch (embedError: unknown) {
      console.error('⚠️ Recipient view failed for', signerType);
      console.error('Error details:', embedError);
      
      // Log more details if available
      if (embedError && typeof embedError === 'object' && 'response' in embedError) {
        const errorResponse = (embedError as { response?: { body?: unknown } }).response;
        console.error('DocuSign API response:', JSON.stringify(errorResponse?.body, null, 2));
      }

      return NextResponse.json({
        success: false,
        error: 'Embedded signing not available. Please check envelope status.',
        emailSent: false
      }, { status: 400 });
    }

  } catch (error: unknown) {
    console.error('❌ Error generating signing URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}