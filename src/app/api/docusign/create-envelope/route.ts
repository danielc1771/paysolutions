import { NextRequest, NextResponse } from 'next/server';
import { createAndSendEnvelope } from '@/utils/docusign/jwt-client';
import { createClient } from '@/utils/supabase/server';
import { getOrganizationOwnerByLoanId } from '@/utils/organization/owner-lookup';
import {
  mapLoanDataToDocuSignFields,
  validateRequiredFields,
  getBorrowerFullName,
  getBorrowerEmail,
  type LoanApplicationData
} from '@/utils/docusign/field-mapper';

/**
 * POST /api/docusign/create-envelope
 * 
 * Creates a DocuSign envelope with loan application data and returns signing URL
 * 
 * Request body:
 * - loanId: string - The loan ID to fetch data from
 * 
 * Response:
 * - envelopeId: string - The DocuSign envelope ID
 * - signingUrl: string - The URL for the borrower to sign the document
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loanId } = body;

    if (!loanId) {
      return NextResponse.json(
        { error: 'Missing loanId in request body' },
        { status: 400 }
      );
    }

    // Fetch loan data from Supabase with payment schedule
    const supabase = await createClient();

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:borrowers(*),
        organization:organizations(*)
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('Failed to fetch loan:', loanError);
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Fetch payment schedule for this loan
    const { data: paymentSchedule, error: scheduleError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_number', { ascending: true });

    if (scheduleError) {
      console.warn('Failed to fetch payment schedule:', scheduleError);
    }

    // Add payment schedule to loan data
    const loanWithSchedule = {
      ...loan,
      payment_schedule: paymentSchedule || []
    };

    // Validate required fields
    const missingFields = validateRequiredFields(loanWithSchedule as LoanApplicationData);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Prepare borrower information
    const borrowerName = getBorrowerFullName(loanWithSchedule as LoanApplicationData);
    const borrowerEmail = getBorrowerEmail(loanWithSchedule as LoanApplicationData);

    // Lookup organization owner for signing
    const orgOwner = await getOrganizationOwnerByLoanId(loanId);

    if (!orgOwner || !orgOwner.email) {
      return NextResponse.json(
        { error: 'Organization owner not found. Please ensure an organization owner is assigned to this loan.' },
        { status: 400 }
      );
    }

    // Map loan data to DocuSign template fields using the field mapper
    const filteredLoanData = mapLoanDataToDocuSignFields(loanWithSchedule as LoanApplicationData);

    console.log('📋 Creating DocuSign envelope for loan:', loanId);
    console.log('👤 Borrower:', borrowerName, borrowerEmail);
    console.log('🏢 Organization Owner:', orgOwner.fullName, orgOwner.email);
    console.log('📝 Fields to populate:', Object.keys(filteredLoanData).length);
    console.log('📅 Payment schedule entries:', paymentSchedule?.length || 0);

    // Create SENT envelope for embedded signing flow (recipient view requires sent status)
    const result = await createAndSendEnvelope(
      borrowerName,
      borrowerEmail,
      filteredLoanData,
      'sent', // Create as sent so iPay can sign via recipient view
      undefined, // Use default iPay email
      orgOwner.email, // Organization owner email
      orgOwner.fullName // Organization owner name
    );

    // Update loan record with envelope ID and set status to pending_ipay_signature
    await supabase
      .from('loans')
      .update({
        docusign_envelope_id: result.envelopeId,
        docusign_org_email: orgOwner.email,
        docusign_org_name: orgOwner.fullName,
        status: 'pending_ipay_signature',
        updated_at: new Date().toISOString()
      })
      .eq('id', loanId);

    console.log('✅ Envelope created and sent:', result.envelopeId);
    console.log('📝 iPay can now sign via embedded recipient view');

    return NextResponse.json({
      success: true,
      envelopeId: result.envelopeId,
      status: result.status,
      message: 'Envelope created and sent successfully. iPay can now sign via embedded recipient view.'
    });

  } catch (error: unknown) {
    console.error('❌ DocuSign envelope creation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create DocuSign envelope';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
