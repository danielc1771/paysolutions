import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import twilio from 'twilio';

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Initialize Twilio client
const twilioClient = twilio(accountSid, authToken);

// Request schema
const sendVerificationSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  loanId: z.string().uuid("Invalid loan ID"),
});

/**
 * Format phone number to E.164 format
 * Assumes US numbers if no country code provided
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it's already in E.164 format (starts with + and has right length)
  if (phone.startsWith('+') && cleaned.length === 11) {
    return phone;
  }
  
  // If it's 10 digits, assume US number
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If it's 11 digits and starts with 1, assume US number
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // Return as-is and let Twilio validate
  return phone;
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!accountSid || !authToken || !verifySid) {
      console.error('❌ Missing Twilio credentials');
      return NextResponse.json(
        { error: 'Twilio configuration error' },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = sendVerificationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { phoneNumber, loanId } = validationResult.data;
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    console.log('📱 Sending verification to:', formattedPhone);
    console.log('🆔 Loan ID:', loanId);

    // Create Supabase client
    const supabase = await createClient();

    // Verify loan exists and get current status
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('id, phone_verification_status')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('❌ Loan not found:', loanError);
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Call Twilio Verify API using SDK
    try {
      const verification = await twilioClient.verify.v2
        .services(verifySid!)
        .verifications.create({
          to: formattedPhone,
          channel: 'sms',
        });

      console.log('✅ Twilio verification created:', verification.sid);

      // Update loan with verification session ID and status
      const { error: updateError } = await supabase
        .from('loans')
        .update({
          phone_verification_session_id: verification.sid,
          phone_verification_status: 'sent',
          verified_phone_number: formattedPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', loanId);

      if (updateError) {
        console.error('❌ Failed to update loan:', updateError);
        // Don't fail the request since verification was sent
      }

      return NextResponse.json({
        success: true,
        verificationSid: verification.sid,
        phoneNumber: formattedPhone,
        status: 'sent',
      });

    } catch (twilioError: any) {
      console.error('❌ Twilio request failed:', twilioError);
      
      // Handle specific Twilio errors
      if (twilioError.code === 60200) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: twilioError.message || 'Failed to send verification code' },
        { status: twilioError.status || 500 }
      );
    }

  } catch (error) {
    console.error('❌ Send verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}