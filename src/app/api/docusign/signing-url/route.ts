import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { authenticateWithJWT } from '@/utils/docusign/client';
import { RolePermissions } from '@/lib/auth/roles';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user profile to check role  
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id, role, full_name, email, status')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 401 });
    }

    // Map the database profile to UserProfile interface format
    const userProfile = {
      id: profile.id,
      organizationId: profile.organization_id,
      role: profile.role,
      fullName: profile.full_name,
      email: profile.email,
      status: profile.status
    };

    // Check if user has admin role or organization-level permissions
    if (!RolePermissions.isAdmin(userProfile) && !RolePermissions.canManageOrganization(userProfile)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { loanId, signerType } = await request.json();

    if (!loanId || !signerType) {
      return NextResponse.json({ 
        error: 'Loan ID and signer type are required' 
      }, { status: 400 });
    }

    if (!['ipay', 'organization', 'borrower'].includes(signerType)) {
      return NextResponse.json({ 
        error: 'Invalid signer type. Must be: ipay, organization, or borrower' 
      }, { status: 400 });
    }

    console.log(`🔗 Generating DocuSign signing URL for loan ${loanId}, signer: ${signerType}`);

    // Get loan with cached URLs and check if they're still valid (24 hours)
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        docusign_envelope_id,
        ipay_signing_url,
        organization_signing_url,
        borrower_signing_url,
        signing_urls_generated_at,
        organization_id,
        borrowers!inner(first_name, last_name, email)
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('❌ Loan not found:', loanId);
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    if (!loan.docusign_envelope_id) {
      return NextResponse.json({ 
        error: 'DocuSign envelope not found for this loan' 
      }, { status: 400 });
    }

    // Check if cached URL exists and is still valid (less than 24 hours old)
    const urlsGeneratedAt = loan.signing_urls_generated_at ? new Date(loan.signing_urls_generated_at) : null;
    const isURLValid = urlsGeneratedAt && (Date.now() - urlsGeneratedAt.getTime()) < 24 * 60 * 60 * 1000;

    const urlFieldMap = {
      ipay: 'ipay_signing_url',
      organization: 'organization_signing_url', 
      borrower: 'borrower_signing_url'
    };

    // If we have a valid cached URL, return it
    const urlField = urlFieldMap[signerType as keyof typeof urlFieldMap];
    const cachedUrl = loan[urlField as keyof typeof loan] as string;
    
    if (isURLValid && cachedUrl) {
      console.log('✅ Using cached signing URL');
      return NextResponse.json({
        success: true,
        signingUrl: cachedUrl,
        cached: true
      });
    }

    // Generate new signing URLs
    console.log('🔄 Generating fresh signing URLs from DocuSign');

    const accessToken = await authenticateWithJWT();
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID!;
    const baseUrl = process.env.DOCUSIGN_BASE_PATH!;

    // Get organization owner for organization signing
    let organizationOwner = null;
    if (signerType === 'organization') {
      const { data: orgOwner } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('organization_id', loan.organization_id)
        .eq('role', 'organization_owner')
        .eq('status', 'ACTIVE')
        .single();
      
      organizationOwner = orgOwner;
      if (!organizationOwner) {
        return NextResponse.json({ 
          error: 'Organization owner not found' 
        }, { status: 400 });
      }
    }

    // Create recipient view requests for all three signers
    const recipientViews = {
      ipay: {
        authenticationMethod: 'none',
        email: 'jhoamadrian@gmail.com',
        userName: 'iPay Admin',
        returnUrl: `${process.env.NEXTAUTH_URL}/admin/loans/${loanId}`,
        clientUserId: 'ipay-admin'
      },
      organization: organizationOwner ? {
        authenticationMethod: 'none',
        email: organizationOwner.email,
        userName: organizationOwner.full_name || 'Organization Owner',
        returnUrl: `${process.env.NEXTAUTH_URL}/dashboard/loans/${loanId}`,
        clientUserId: 'organization-owner'
      } : null,
      borrower: (loan.borrowers && loan.borrowers.length > 0) ? {
        authenticationMethod: 'none',
        email: loan.borrowers[0].email,
        userName: `${loan.borrowers[0].first_name} ${loan.borrowers[0].last_name}`,
        returnUrl: `${process.env.NEXTAUTH_URL}/borrower/loans/${loanId}`,
        clientUserId: 'borrower'
      } : null
    };

    // Generate all signing URLs
    const urls: { [key: string]: string } = {};

    for (const [type, viewRequest] of Object.entries(recipientViews)) {
      if (!viewRequest) continue;

      try {
        const response = await fetch(
          `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${loan.docusign_envelope_id}/views/recipient`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(viewRequest)
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            urls[`${type}_signing_url`] = data.url;
            console.log(`✅ Generated ${type} signing URL`);
          }
        } else {
          console.error(`❌ Failed to generate ${type} signing URL:`, response.status);
        }
      } catch (error) {
        console.error(`❌ Error generating ${type} signing URL:`, error);
      }
    }

    // Update database with new URLs
    const updateData = {
      ...urls,
      signing_urls_generated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', loanId);

    if (updateError) {
      console.error('❌ Failed to cache signing URLs:', updateError);
    } else {
      console.log('✅ Cached signing URLs in database');
    }

    // Return the requested signing URL
    const requestedUrl = urls[`${signerType}_signing_url`] || '';

    if (!requestedUrl) {
      return NextResponse.json({ 
        error: `Failed to generate ${signerType} signing URL` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      signingUrl: requestedUrl,
      cached: false
    });

  } catch (error) {
    console.error('❌ DocuSign signing URL generation error:', error);
    return NextResponse.json({
      error: 'Failed to generate signing URL'
    }, { status: 500 });
  }
}