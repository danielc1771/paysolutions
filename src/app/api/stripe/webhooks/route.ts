import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.log(`❌ Error message: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const supabase = await createClient();

  // Handle the event
  switch (event.type) {
    case 'identity.verification_session.verified': {
      // All the verification checks passed
      const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
      
      console.log('✅ Verification session verified:', verificationSession.id);
      
      // Update the loan and borrower records
      if (verificationSession.metadata?.loan_id) {
        try {
          // Get the loan to find the borrower
          const { data: loan } = await supabase
            .from('loans')
            .select('borrower_id')
            .eq('id', verificationSession.metadata.loan_id)
            .single();

          if (loan?.borrower_id) {
            // Update borrower KYC status
            await supabase
              .from('borrowers')
              .update({ 
                kyc_status: 'completed',
                stripe_verification_session_id: verificationSession.id
              })
              .eq('id', loan.borrower_id);

            // Update loan metadata to include verification status
            await supabase
              .from('loans')
              .update({
                metadata: {
                  stripe_verification_status: 'verified',
                  stripe_verification_session_id: verificationSession.id,
                  verified_at: new Date().toISOString()
                }
              })
              .eq('id', verificationSession.metadata.loan_id);

            console.log('✅ Updated borrower KYC status to completed');
          }
        } catch (error) {
          console.error('❌ Error updating verification status:', error);
        }
      }
      break;
    }

    case 'identity.verification_session.requires_input': {
      // At least one of the verification checks failed
      const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
      
      console.log('❌ Verification check failed:', verificationSession.last_error?.reason);
      
      // Update the loan and borrower records
      if (verificationSession.metadata?.loan_id) {
        try {
          // Get the loan to find the borrower
          const { data: loan } = await supabase
            .from('loans')
            .select('borrower_id')
            .eq('id', verificationSession.metadata.loan_id)
            .single();

          if (loan?.borrower_id) {
            // Update borrower KYC status
            await supabase
              .from('borrowers')
              .update({ 
                kyc_status: 'failed',
                stripe_verification_session_id: verificationSession.id
              })
              .eq('id', loan.borrower_id);

            // Update loan metadata to include verification status
            await supabase
              .from('loans')
              .update({
                metadata: {
                  stripe_verification_status: 'requires_input',
                  stripe_verification_session_id: verificationSession.id,
                  verification_error: verificationSession.last_error?.reason,
                  verification_error_code: verificationSession.last_error?.code,
                  failed_at: new Date().toISOString()
                }
              })
              .eq('id', verificationSession.metadata.loan_id);

            console.log('❌ Updated borrower KYC status to failed');
          }
        } catch (error) {
          console.error('❌ Error updating failed verification status:', error);
        }
      }

      // Handle specific failure reasons
      switch (verificationSession.last_error?.code) {
        case 'document_unverified_other':
          console.log('Document was invalid');
          break;
        case 'document_expired':
          console.log('Document was expired');
          break;
        case 'document_type_not_supported':
          console.log('Document type not supported');
          break;
        case 'consent_declined':
          console.log('User declined verification by Stripe');
          break;
        case 'device_unsupported':
          console.log('User is on a device without camera');
          break;
        case 'under_supported_age':
          console.log('User is under the age of majority');
          break;
        default:
          console.log('Other verification failure:', verificationSession.last_error?.code);
      }
      break;
    }

    case 'identity.verification_session.processing': {
      const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
      console.log('🔄 Verification session processing:', verificationSession.id);
      
      // Update status to processing
      if (verificationSession.metadata?.loan_id) {
        try {
          const { data: loan } = await supabase
            .from('loans')
            .select('borrower_id')
            .eq('id', verificationSession.metadata.loan_id)
            .single();

          if (loan?.borrower_id) {
            await supabase
              .from('borrowers')
              .update({ 
                kyc_status: 'pending',
                stripe_verification_session_id: verificationSession.id
              })
              .eq('id', loan.borrower_id);

            await supabase
              .from('loans')
              .update({
                metadata: {
                  stripe_verification_status: 'processing',
                  stripe_verification_session_id: verificationSession.id,
                  processing_started_at: new Date().toISOString()
                }
              })
              .eq('id', verificationSession.metadata.loan_id);
          }
        } catch (error) {
          console.error('❌ Error updating processing status:', error);
        }
      }
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}