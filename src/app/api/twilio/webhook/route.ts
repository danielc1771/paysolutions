import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

/**
 * Verify Twilio webhook signature
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  // Sort the POST parameters alphabetically by key name
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}${params[key]}`)
    .join('');

  // Concatenate the URL and sorted parameters
  const data = url + sortedParams;

  // Compute the HMAC-SHA1 hash using the auth token as the key
  const computedSignature = crypto
    .createHmac('sha1', authToken)
    .update(data)
    .digest('base64');

  // Compare signatures
  return computedSignature === signature;
}

/**
 * Map Twilio event types to our verification status
 */
function mapEventToStatus(eventType: string): string | null {
  const statusMap: Record<string, string> = {
    'com.twilio.accountsecurity.verify.verification.pending': 'sent',
    'com.twilio.accountsecurity.verify.verification.approved': 'verified',
    'com.twilio.accountsecurity.verify.verification.expired': 'expired',
    'com.twilio.accountsecurity.verify.verification.canceled': 'failed',
    'com.twilio.accountsecurity.verify.verification.max-attempts-reached': 'failed',
  };
  
  return statusMap[eventType] || null;
}

export async function POST(request: NextRequest) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!authToken) {
      console.error('❌ Missing Twilio auth token');
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }

    // Get the webhook signature
    const signature = request.headers.get('x-twilio-signature');
    if (!signature) {
      console.error('❌ Missing Twilio signature header');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Get the full URL for signature verification
    const url = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}${request.url}`;
    
    // Parse the webhook body
    const text = await request.text();
    const params = new URLSearchParams(text);
    const body: Record<string, string> = {};
    params.forEach((value, key) => {
      body[key] = value;
    });

    console.log('🔔 Twilio webhook received');
    console.log('📋 Event type:', body.EventType);
    console.log('🆔 Verification SID:', body.VerificationSid);

    // Verify the webhook signature
    const isValid = verifyTwilioSignature(authToken, signature, url, body);
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse the event data
    const eventType = body.EventType;
    const verificationSid = body.VerificationSid;
    const phoneNumber = body.To;
    
    if (!eventType || !verificationSid) {
      console.error('❌ Missing required webhook data');
      return NextResponse.json(
        { error: 'Invalid webhook data' },
        { status: 400 }
      );
    }

    // Map event type to our status
    const newStatus = mapEventToStatus(eventType);
    if (!newStatus) {
      console.log('⚠️ Unhandled event type:', eventType);
      return NextResponse.json({ success: true, message: 'Event ignored' });
    }

    // Update the loan record
    const supabase = await createClient();
    
    // Find the loan by verification session ID
    const { data: loan, error: findError } = await supabase
      .from('loans')
      .select('id')
      .eq('phone_verification_session_id', verificationSid)
      .single();

    if (findError || !loan) {
      console.error('❌ Loan not found for verification SID:', verificationSid);
      // Return success to prevent webhook retries
      return NextResponse.json({ success: true });
    }

    // Update the loan with the new status
    const updateData: Record<string, unknown> = {
      phone_verification_status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // If verified, ensure we have the verified phone number
    if (newStatus === 'verified' && phoneNumber) {
      updateData.verified_phone_number = phoneNumber;
    }

    const { error: updateError } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', loan.id);

    if (updateError) {
      console.error('❌ Failed to update loan:', updateError);
      // Still return success to prevent webhook retries
    }

    console.log('✅ Loan updated with verification status:', {
      loanId: loan.id,
      status: newStatus,
      verificationSid,
    });

    return NextResponse.json({
      success: true,
      loanId: loan.id,
      status: newStatus,
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Return success to prevent webhook retries
    return NextResponse.json({ success: true });
  }
}