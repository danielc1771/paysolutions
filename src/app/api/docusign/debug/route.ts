import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createEnvelopesApi } from '@/utils/docusign/client';

/**
 * Debug endpoint to test DocuSign status checking
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const envelopeId = searchParams.get('envelopeId');
    
    const supabase = await createClient();
    
    if (action === 'test-webhook') {
      // Test webhook endpoint
      return NextResponse.json({
        webhookUrl: `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}/api/docusign/webhook`,
        message: 'Webhook endpoint URL',
        note: 'This URL needs to be registered in DocuSign Admin for webhooks to work'
      });
    }
    
    if (action === 'list-loans-with-envelopes') {
      // Get all loans with DocuSign envelope IDs
      const { data: loans, error } = await supabase
        .from('loans')
        .select('id, loan_number, docusign_envelope_id, docusign_status, status, docusign_status_updated')
        .not('docusign_envelope_id', 'is', null)
        .order('docusign_status_updated', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      return NextResponse.json({
        loans,
        count: loans?.length || 0,
        message: 'Loans with DocuSign envelope IDs'
      });
    }
    
    if (action === 'check-envelope-status' && envelopeId) {
      // Check specific envelope status from DocuSign
      console.log('🔍 Checking envelope status for:', envelopeId);
      
      const { envelopesApi, accountId } = await createEnvelopesApi();
      
      try {
        // Get envelope details
        const envelope = await envelopesApi.getEnvelope(accountId, envelopeId);
        
        // Get recipients
        let recipients: Record<string, unknown> | null = null;
        try {
          recipients = await (envelopesApi as Record<string, unknown>).listRecipients(accountId, envelopeId) as Record<string, unknown>;
        } catch (recipientError) {
          console.warn('Could not fetch recipients:', recipientError);
        }
        
        // Check corresponding loan in database
        const { data: loan } = await supabase
          .from('loans')
          .select('id, docusign_status, status, docusign_status_updated')
          .eq('docusign_envelope_id', envelopeId)
          .single();
          
        return NextResponse.json({
          envelopeId,
          docusignData: {
            status: envelope.status,
            completedDateTime: envelope.completedDateTime,
            statusChangedDateTime: envelope.statusChangedDateTime,
            sentDateTime: (envelope as Record<string, unknown>).sentDateTime,
            deliveredDateTime: (envelope as Record<string, unknown>).deliveredDateTime
          },
          recipients: recipients ? {
            signers: (recipients.signers as Record<string, unknown>[])?.map((s: Record<string, unknown>) => ({
              name: s.name,
              email: s.email,
              status: s.status,
              signedDateTime: s.signedDateTime,
              deliveredDateTime: s.deliveredDateTime
            }))
          } : null,
          databaseData: loan ? {
            loanId: loan.id,
            docusignStatus: loan.docusign_status,
            loanStatus: loan.status,
            lastUpdated: loan.docusign_status_updated
          } : null,
          mismatch: loan && envelope.status?.toLowerCase() !== loan.docusign_status
        });
        
      } catch (docusignError) {
        console.error('DocuSign API error:', docusignError);
        return NextResponse.json({
          error: 'Failed to fetch from DocuSign API',
          details: docusignError instanceof Error ? docusignError.message : 'Unknown error'
        }, { status: 500 });
      }
    }
    
    // Default: show available debug actions
    return NextResponse.json({
      availableActions: [
        {
          action: 'test-webhook',
          url: '/api/docusign/debug?action=test-webhook',
          description: 'Get webhook URL for registration'
        },
        {
          action: 'list-loans-with-envelopes',
          url: '/api/docusign/debug?action=list-loans-with-envelopes',
          description: 'List all loans with DocuSign envelope IDs'
        },
        {
          action: 'check-envelope-status',
          url: '/api/docusign/debug?action=check-envelope-status&envelopeId=ENVELOPE_ID',
          description: 'Check specific envelope status vs database'
        }
      ],
      message: 'DocuSign Debug Tools'
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Force update a loan's DocuSign status (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const { envelopeId } = await request.json();
    
    if (!envelopeId) {
      return NextResponse.json({ error: 'envelopeId required' }, { status: 400 });
    }
    
    console.log('🔄 Force refreshing status for envelope:', envelopeId);
    
    // Call the status endpoint to force an update
    const statusResponse = await fetch(`${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}/api/docusign/status/${envelopeId}`);
    const statusData = await statusResponse.json();
    
    return NextResponse.json({
      message: 'Force refresh completed',
      statusData
    });
    
  } catch (error) {
    console.error('Force refresh error:', error);
    return NextResponse.json({
      error: 'Force refresh failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}