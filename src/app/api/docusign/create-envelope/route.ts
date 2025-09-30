import { NextRequest, NextResponse } from 'next/server';
import { createAndSendEnvelope } from '@/utils/docusign/jwt-client';
import { createClient } from '@/utils/supabase/server';
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
        borrower:borrowers(*)
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

    // Map loan data to DocuSign template fields using the field mapper
    const filteredLoanData = mapLoanDataToDocuSignFields(loanWithSchedule as LoanApplicationData);

    console.log('📋 Creating DocuSign envelope for loan:', loanId);
    console.log('👤 Borrower:', borrowerName, borrowerEmail);
    console.log('📝 Fields to populate:', Object.keys(filteredLoanData).length);
    console.log('📅 Payment schedule entries:', paymentSchedule?.length || 0);

    // Create envelope and send to all signers via email
    const result = await createAndSendEnvelope(
      borrowerName,
      borrowerEmail,
      filteredLoanData
    );

    // Update loan record with envelope ID
    await supabase
      .from('loans')
      .update({
        docusign_envelope_id: result.envelopeId,
        docusign_status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', loanId);

    console.log('✅ Envelope created successfully:', result.envelopeId);
    console.log('📧 All signers will receive email notifications in order');

    return NextResponse.json({
      success: true,
      envelopeId: result.envelopeId,
      status: result.status,
      message: 'Envelope sent successfully. All signers will receive email notifications in sequential order.'
    });

  } catch (error: any) {
    console.error('❌ DocuSign envelope creation failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create DocuSign envelope' },
      { status: 500 }
    );
  }
}
