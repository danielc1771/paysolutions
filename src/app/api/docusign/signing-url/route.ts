import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getEnvelopesApi, makeRecipientViewRequest } from '@/utils/docusign/jwt-client';

const IPAY_EMAIL = 'architex.development@gmail.com';
const ORGANIZATION_EMAIL = 'architex.development@gmail.com';
const CLIENT_USER_ID = process.env.DOCUSIGN_INTEGRATION_KEY || '';

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

    // Determine signer details based on type
    let signerEmail = '';
    let signerName = '';

    switch (signerType) {
      case 'ipay':
        signerEmail = IPAY_EMAIL;
        signerName = 'iPay Representative';
        break;
      case 'organization':
        signerEmail = ORGANIZATION_EMAIL;
        signerName = 'Organization Representative';
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
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid signer type'
        }, { status: 400 });
    }

    // Create recipient view request
    const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/loans/${loanId}?signed=true`;

    const envelopesApi = await getEnvelopesApi();
    const viewRequest = makeRecipientViewRequest(signerName, signerEmail, returnUrl);

    // IMPORTANT: For embedded signing, we need to set clientUserId
    // This should match what was set when creating the envelope
    viewRequest.clientUserId = CLIENT_USER_ID;

    try {
      const result = await envelopesApi.createRecipientView(
        process.env.API_ACCOUNT_ID!,
        loan.docusign_envelope_id,
        { recipientViewRequest: viewRequest }
      );

      const signingUrl = result.url;

      // Cache the signing URL in database
      const updateData: Record<string, string> = {
        [urlField]: signingUrl ?? "",
        signing_urls_generated_at: new Date().toISOString()
      };

      await supabase
        .from('loans')
        .update(updateData)
        .eq('id', loanId);

      console.log(`✅ Signing URL generated and cached for ${signerType}`);

      return NextResponse.json({
        success: true,
        signingUrl,
        cached: false
      });
    } catch (embedError: unknown) {
      console.warn('⚠️ Embedded signing failed, recipient may need to sign via email:', (embedError as Error)?.message);

      // If embedded signing fails, return a message that the user should check their email
      return NextResponse.json({
        success: false,
        error: 'Embedded signing not available. Please check your email for the DocuSign link.',
        emailSent: true
      }, { status: 200 });
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