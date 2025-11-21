import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import { z } from 'zod';
import twilio from 'twilio';

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Initialize Twilio client
const twilioClient = twilio(accountSid, authToken);

// Request schema - supports both loanId and verificationId
const sendVerificationSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  loanId: z.string().uuid("Invalid loan ID").optional(),
  verificationId: z.string().uuid("Invalid verification ID").optional(),
}).refine(data => data.loanId || data.verificationId, {
  message: "Either loanId or verificationId is required",
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
      console.error('❌ Missing Twilio credentials:');
      console.error('- TWILIO_ACCOUNT_SID:', accountSid ? 'SET' : 'MISSING');
      console.error('- TWILIO_AUTH_TOKEN:', authToken ? 'SET' : 'MISSING');
      console.error('- TWILIO_VERIFY_SERVICE_SID:', verifySid ? 'SET' : 'MISSING');
      
      return NextResponse.json(
        { 
          error: 'Phone verification is not configured. Please contact support.',
          details: 'Twilio SMS service is not properly configured on the server.' 
        },
        { status: 503 } // Service Unavailable
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

    const { phoneNumber, loanId, verificationId } = validationResult.data;
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const isStandaloneVerification = !!verificationId;

    console.log('📱 Sending verification to:', formattedPhone);
    console.log('🆔 Type:', isStandaloneVerification ? 'Standalone Verification' : 'Loan');
    console.log('🆔 ID:', isStandaloneVerification ? verificationId : loanId);

    // Use admin client to bypass RLS
    const supabase = await createAdminClient();

    // Verify the record exists
    if (isStandaloneVerification) {
      const { data: verification, error: verificationError } = await supabase
        .from('verifications')
        .select('id, phone_verification_status')
        .eq('id', verificationId)
        .single();

      if (verificationError || !verification) {
        console.error('❌ Verification not found:', verificationError);
        return NextResponse.json(
          { error: 'Verification not found' },
          { status: 404 }
        );
      }
    } else {
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

      // Update the appropriate record with verification session ID and status
      if (isStandaloneVerification) {
        const { error: updateError } = await supabase
          .from('verifications')
          .update({
            phone_verification_session_id: verification.sid,
            phone_verification_status: 'sent',
            updated_at: new Date().toISOString(),
          })
          .eq('id', verificationId);

        if (updateError) {
          console.error('❌ Failed to update verification:', updateError);
        }
      } else {
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
        }
      }

      return NextResponse.json({
        success: true,
        verificationSid: verification.sid,
        phoneNumber: formattedPhone,
        status: 'sent',
      });

    } catch (error) {
      const twilioError = error as  { code: number; message: string; status: number };
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