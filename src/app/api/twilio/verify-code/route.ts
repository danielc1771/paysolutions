import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import { z } from 'zod';
import twilio from 'twilio';
import { reportVerificationUsage } from '@/utils/stripe/verification-billing';

// Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Initialize Twilio client
const twilioClient = twilio(accountSid, authToken);

// Request schema - supports both loanId and verificationId
const verifyCodeSchema = z.object({
  phoneNumber: z.string().min(1, "Phone number is required"),
  code: z.string().min(1, "Verification code is required"),
  loanId: z.string().uuid("Invalid loan ID").optional(),
  verificationId: z.string().uuid("Invalid verification ID").optional(),
}).refine(data => data.loanId || data.verificationId, {
  message: "Either loanId or verificationId is required",
});

/**
 * Format phone number to E.164 format (same as send-verification)
 */
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (phone.startsWith('+') && cleaned.length === 11) {
    return phone;
  }
  
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
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

    console.log('🔧 Twilio config check:');
    console.log('- Account SID:', accountSid?.substring(0, 8) + '...');
    console.log('- Verify Service SID:', verifySid);

    const body = await request.json();
    
    // Validate request body
    const validationResult = verifyCodeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { phoneNumber, code, loanId, verificationId } = validationResult.data;
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const isStandaloneVerification = !!verificationId;

    console.log('🔐 Verifying code for:', formattedPhone);
    console.log('🆔 Type:', isStandaloneVerification ? 'Standalone Verification' : 'Loan');
    console.log('🆔 ID:', isStandaloneVerification ? verificationId : loanId);
    console.log('📝 Code length:', code.length);

    // Use admin client to bypass RLS
    const supabase = await createAdminClient();

    // Check current verification status
    let currentStatus: string | null = null;

    if (isStandaloneVerification) {
      const { data: verification, error: verificationError } = await supabase
        .from('verifications')
        .select('id, phone_verification_session_id, phone_verification_status')
        .eq('id', verificationId)
        .single();

      if (verificationError || !verification) {
        console.error('❌ Verification not found:', verificationError);
        return NextResponse.json(
          { error: 'Verification not found' },
          { status: 404 }
        );
      }
      currentStatus = verification.phone_verification_status;
    } else {
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .select('id, phone_verification_session_id, phone_verification_status')
        .eq('id', loanId)
        .single();

      if (loanError || !loan) {
        console.error('❌ Loan not found:', loanError);
        return NextResponse.json(
          { error: 'Loan not found' },
          { status: 404 }
        );
      }
      currentStatus = loan.phone_verification_status;
    }

    // Check if already verified
    if (currentStatus === 'verified') {
      console.log('✅ Phone already verified');
      return NextResponse.json({
        success: true,
        status: 'approved',
        message: 'Phone number already verified',
      });
    }

    // Call Twilio Verify Check API using SDK
    try {
      const verificationCheck = await twilioClient.verify.v2
        .services(verifySid!)
        .verificationChecks.create({
          to: formattedPhone,
          code: code,
        });

      console.log('📋 Twilio verification result:', {
        status: verificationCheck.status,
        valid: verificationCheck.valid,
        sid: verificationCheck.sid,
      });

      // Check if verification was successful
      if (verificationCheck.status === 'approved' && verificationCheck.valid) {
        // Update the appropriate record with verified status
        if (isStandaloneVerification) {
          // Check if identity is also verified to mark as completed
          const { data: verificationData } = await supabase
            .from('verifications')
            .select('stripe_verification_status, organization_id')
            .eq('id', verificationId)
            .single();

          const isIdentityVerified = verificationData?.stripe_verification_status === 'verified';

          const { error: updateError } = await supabase
            .from('verifications')
            .update({
              phone_verification_status: 'verified',
              phone_verified_at: new Date().toISOString(),
              // Mark as completed if identity is also verified
              ...(isIdentityVerified ? {
                status: 'completed',
                completed_at: new Date().toISOString(),
              } : {
                status: 'phone_verified',
              }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', verificationId);

          if (updateError) {
            console.error('❌ Failed to update verification:', updateError);
          }

          // Report usage for billing when verification is completed
          if (isIdentityVerified && verificationData?.organization_id) {
            try {
              await reportVerificationUsage(verificationData.organization_id, verificationId!);
              console.log('📊 Reported verification usage for billing (phone completed verification)');
            } catch (billingError) {
              console.error('Error reporting verification usage:', billingError);
              // Don't fail the verification if billing fails
            }
          }
        } else {
          const { error: updateError } = await supabase
            .from('loans')
            .update({
              phone_verification_status: 'verified',
              verified_phone_number: formattedPhone,
              updated_at: new Date().toISOString(),
            })
            .eq('id', loanId);

          if (updateError) {
            console.error('❌ Failed to update loan:', updateError);
          }
        }

        console.log('✅ Phone verification successful');
        return NextResponse.json({
          success: true,
          status: 'approved',
          message: 'Phone number verified successfully',
        });

      } else {
        // Verification failed
        console.log('❌ Verification failed:', verificationCheck.status);

        // Update status to failed if max attempts reached
        if (verificationCheck.status === 'canceled') {
          if (isStandaloneVerification) {
            await supabase
              .from('verifications')
              .update({
                phone_verification_status: 'failed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', verificationId);
          } else {
            await supabase
              .from('loans')
              .update({
                phone_verification_status: 'failed',
                updated_at: new Date().toISOString(),
              })
              .eq('id', loanId);
          }
        }

        return NextResponse.json({
          success: false,
          status: verificationCheck.status,
          message: 'Invalid verification code',
        });
      }

    } catch (error) {
      const twilioError = error as  { code: number; message: string; status: number };
      console.error('❌ Twilio request failed:', twilioError);

      // Handle specific Twilio errors
      if (twilioError.code === 60202) {
        return NextResponse.json(
          { error: 'Max check attempts reached. Please request a new code.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: twilioError.message || 'Failed to verify code' },
        { status: twilioError.status || 500 }
      );
    }

  } catch (error) {
    console.error('❌ Verify code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}