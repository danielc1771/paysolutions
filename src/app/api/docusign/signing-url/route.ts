import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getEnvelopesApi, makeRecipientViewRequest } from '@/utils/docusign/jwt-client';

const IPAY_EMAIL = 'architex.development@gmail.com';
const ORGANIZATION_EMAIL = 'architex.development@gmail.com';
const INTEGRATION_KEY = process.env.INTEGRATION_KEY || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * POST /api/docusign/signing-url
 *
 * Generate or retrieve cached signing URL for a specific signer
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

    // Check if we have a cached URL that's still valid (24 hours)
    const urlField = `${signerType}_signing_url`;
    const cachedUrl = loan[urlField];
    const urlGeneratedAt = loan.signing_urls_generated_at;

    if (cachedUrl && urlGeneratedAt) {
      const urlAge = Date.now() - new Date(urlGeneratedAt).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (urlAge < twentyFourHours) {
        console.log(`✅ Returning cached signing URL for ${signerType}`);
        return NextResponse.json({
          success: true,
          signingUrl: cachedUrl,
          cached: true
        });
      }
    }

    // Generate new signing URL
    console.log(`🔄 Generating new signing URL for ${signerType}`);

    const envelopesApi = await getEnvelopesApi();
    const returnUrl = `${BASE_URL}/docusign-complete?event=signing_complete&loanId=${loanId}&signerType=${signerType}`;

    // iPay and Organization use recipient view (embedded signing)
    // Borrower uses email-based signing
    let signerEmail = '';
    let signerName = '';
    let clientUserId = '';

    switch (signerType) {
      case 'ipay':
        signerEmail = IPAY_EMAIL;
        signerName = 'iPay Representative';
        clientUserId = `${INTEGRATION_KEY}-ipay`;
        break;
      case 'organization':
        signerEmail = ORGANIZATION_EMAIL;
        signerName = 'Organization Representative';
        clientUserId = `${INTEGRATION_KEY}-organization`;
        break;
      case 'borrower':
        // For borrower, we need to fetch their details
        const { data: borrower } = await supabase
          .from('borrowers')
          .select('email, first_name, last_name')
          .eq('id', loan.borrower_id)
          .single();

        if (!borrower) {
          return NextResponse.json({
            success: false,
            error: 'Borrower not found'
          }, { status: 404 });
        }

        signerEmail = borrower.email;
        signerName = `${borrower.first_name} ${borrower.last_name}`;
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

      // Cache the signing URL in database
      await supabase
        .from('loans')
        .update({
          [urlField]: signingUrl ?? "",
          signing_urls_generated_at: new Date().toISOString()
        })
        .eq('id', loanId);

      console.log(`✅ Recipient view URL generated and cached for ${signerType}`);

      return NextResponse.json({
        success: true,
        signingUrl,
        cached: false
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