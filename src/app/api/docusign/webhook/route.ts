import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Hardcoded signer emails for now
const IPAY_ADMIN_EMAIL = 'jhoamadrian@gmail.com';
const ORG_OWNER_EMAIL = 'jgarcia@easycarus.com'; // EasyCar organization owner

/**
 * Identifies the signer type based on email
 */
function identifySignerType(email: string): 'ipay' | 'organization' | 'borrower' | null {
  const normalizedEmail = email?.toLowerCase().trim();

  if (normalizedEmail === IPAY_ADMIN_EMAIL.toLowerCase()) {
    return 'ipay';
  }
  if (normalizedEmail === ORG_OWNER_EMAIL.toLowerCase()) {
    return 'organization';
  }
  // Anyone else is assumed to be the borrower
  if (normalizedEmail) {
    return 'borrower';
  }

  return null;
}

/**
 * Get human-readable status label for display
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case 'application_completed':
      return 'Awaiting iPay Signature';
    case 'ipay_approved':
      return 'Awaiting Organization Signature';
    case 'dealer_approved':
      return 'Awaiting Borrower Signature';
    case 'fully_signed':
      return 'Fully Signed';
    default:
      return status;
  }
}

/**
 * POST /api/docusign/webhook
 *
 * Enhanced webhook endpoint for DocuSign to notify us of envelope and recipient events
 *
 * DocuSign will send notifications when:
 * - Envelope is sent/delivered/completed/declined/voided
 * - Individual recipients complete their signing
 *
 * This webhook implements three-stage signing progression:
 * 1. iPay Admin signs → status becomes 'ipay_approved'
 * 2. Organization Owner signs → status becomes 'dealer_approved'
 * 3. Borrower signs → status becomes 'fully_signed'
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📨 DocuSign webhook received');
    console.log('Event:', body.event);
    console.log('Full webhook payload:', JSON.stringify(body, null, 2));

    // Extract envelope information
    const envelopeId = body.data?.envelopeId;
    const event = body.event;

    if (!envelopeId) {
      console.warn('⚠️ Webhook received without envelope ID');
      return NextResponse.json({ received: true });
    }

    const supabase = await createClient();

    // Handle recipient-level events for three-stage tracking
    if (event === 'recipient-completed' || event === 'recipient-sent' || event === 'recipient-delivered') {
      const recipientEmail = body.data?.email || body.data?.recipient?.email;
      const recipientName = body.data?.name || body.data?.recipient?.name;
      const completedTime = body.data?.completedTime || body.data?.statusDateTime || new Date().toISOString();

      console.log('👤 Recipient event:', {
        event,
        email: recipientEmail,
        name: recipientName,
        time: completedTime
      });

      if (!recipientEmail) {
        console.warn('⚠️ Recipient event without email');
        return NextResponse.json({ received: true });
      }

      const signerType = identifySignerType(recipientEmail);
      console.log('🔍 Identified signer type:', signerType);

      if (!signerType) {
        console.warn('⚠️ Could not identify signer type for email:', recipientEmail);
        return NextResponse.json({ received: true });
      }

      // Only process completion events for status progression
      if (event === 'recipient-completed') {
        // Determine the update based on signer type
        let updateData: Record<string, string> = {
          updated_at: new Date().toISOString()
        };

        switch (signerType) {
          case 'ipay':
            console.log('✅ iPay Admin completed signing');
            updateData = {
              ...updateData,
              status: 'ipay_approved',
              ipay_signed_at: completedTime,
              ipay_signer_status: 'completed'
            };
            break;

          case 'organization':
            console.log('✅ Organization Owner completed signing');
            updateData = {
              ...updateData,
              status: 'dealer_approved',
              organization_signed_at: completedTime,
              organization_signer_status: 'completed'
            };
            break;

          case 'borrower':
            console.log('✅ Borrower completed signing');
            updateData = {
              ...updateData,
              status: 'fully_signed',
              borrower_signed_at: completedTime,
              borrower_signer_status: 'completed',
              docusign_status: 'completed',
              docusign_completed_at: completedTime
            };
            break;
        }

        console.log('📝 Updating loan with:', updateData);

        const { data: updatedLoan, error } = await supabase
          .from('loans')
          .update(updateData)
          .eq('docusign_envelope_id', envelopeId)
          .select()
          .single();

        if (error) {
          console.error('❌ Failed to update loan:', error);
        } else {
          console.log('✅ Loan updated successfully');
          console.log('New status:', updatedLoan.status);
          console.log('Status label:', getStatusLabel(updatedLoan.status));

          // Log next expected signer
          switch (updatedLoan.status) {
            case 'ipay_approved':
              console.log('📧 Next: Organization Owner will receive signing email');
              break;
            case 'dealer_approved':
              console.log('📧 Next: Borrower will receive signing email');
              break;
            case 'fully_signed':
              console.log('🎉 All signatures complete! Document is fully executed.');
              break;
          }
        }
      }
    }

    // Handle envelope-level events
    else if (event.includes('envelope-')) {
      let docusignStatus = 'unknown';

      if (event.includes('sent')) docusignStatus = 'sent';
      else if (event.includes('delivered')) docusignStatus = 'delivered';
      else if (event.includes('completed')) {
        docusignStatus = 'completed';
        console.log('🎉 Entire envelope completed - all signers have signed');
      }
      else if (event.includes('declined')) docusignStatus = 'declined';
      else if (event.includes('voided')) docusignStatus = 'voided';

      console.log('📋 Envelope event:', event);
      console.log('📝 Updating DocuSign status to:', docusignStatus);

      const updateData: Record<string, string> = {
        docusign_status: docusignStatus,
        docusign_status_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Only update to fully_signed if envelope is completed and not already set
      if (docusignStatus === 'completed') {
        const { data: currentLoan } = await supabase
          .from('loans')
          .select('status')
          .eq('docusign_envelope_id', envelopeId)
          .single();

        if (currentLoan && currentLoan.status !== 'fully_signed') {
          updateData.status = 'fully_signed';
          updateData.docusign_completed_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('loans')
        .update(updateData)
        .eq('docusign_envelope_id', envelopeId);

      if (error) {
        console.error('❌ Failed to update loan:', error);
      } else {
        console.log('✅ Loan DocuSign status updated successfully');
      }
    }

    // Return success to DocuSign
    return NextResponse.json({ received: true });

  } catch (error: unknown) {
    console.error('❌ Webhook processing failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Still return 200 to DocuSign to prevent retries
    return NextResponse.json({ received: true, error: errorMessage });
  }
}

/**
 * GET /api/docusign/webhook
 *
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'DocuSign webhook endpoint is active',
    description: 'Three-stage signing workflow enabled',
    signers: {
      stage1: { role: 'iPay Admin', email: IPAY_ADMIN_EMAIL },
      stage2: { role: 'Organization Owner', email: ORG_OWNER_EMAIL },
      stage3: { role: 'Borrower', email: 'Dynamic from application' }
    }
  });
}