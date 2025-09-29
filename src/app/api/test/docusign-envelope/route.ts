import { NextRequest, NextResponse } from 'next/server';
import { getEnvelopesApi, createEnvelope, createRecipientViewRequest } from '@/utils/docusign/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 Testing DocuSign envelope creation with data:', body);
    
    // Get DocuSign API client
    const { envelopesApi, accountId } = await getEnvelopesApi();
    
    console.log('📋 DocuSign Configuration:');
    console.log('Account ID:', accountId);
    console.log('Template ID:', process.env.DOCUSIGN_TEMPLATE_ID);
    console.log('Client User ID:', process.env.DOCUSIGN_CLIENT_USER_ID);
    
    // Create envelope
    const envelope = createEnvelope(body);
    
    console.log('📤 Envelope Definition:', JSON.stringify(envelope, null, 2));
    console.log('📤 Sending envelope to DocuSign...');
    
    const result = await envelopesApi.createEnvelope(accountId, {
      envelopeDefinition: envelope
    });
    
    if (!result || !result.envelopeId) {
      throw new Error('Failed to create DocuSign envelope');
    }
    
    console.log('✅ DocuSign envelope created:', result.envelopeId);
    
    // Create recipient view for embedded signing
    const returnUrl = new URL('/admin/docusign-success', request.url).toString();
    const viewRequest = createRecipientViewRequest(body.borrowerName, body.borrowerEmail, returnUrl);
    
    console.log('🔗 Creating recipient view for embedded signing...');
    
    // Try to create recipient view for embedded signing
    let signingUrl = null;
    try {
      const viewResult = await (envelopesApi as any).createRecipientView(accountId, result.envelopeId, {
        recipientViewRequest: viewRequest
      });
      
      console.log('✅ Recipient view created:', viewResult.url);
      signingUrl = viewResult.url;
    } catch (viewError) {
      console.error('⚠️ Failed to create recipient view:', viewError);
      // Continue without signing URL - envelope was still created
    }
    
    return NextResponse.json({
      success: true,
      envelopeId: result.envelopeId,
      status: (result as any).status || 'sent',
      signingUrl: signingUrl,
      message: 'DocuSign envelope created successfully!'
    });
    
  } catch (error) {
    console.error('❌ DocuSign envelope test failed:', error);
    
    // Log detailed error information
    if (error && typeof error === 'object' && 'message' in error) {
      console.error('Error details:', {
        message: (error as any).message,
        response: (error as any).response?.data,
        status: (error as any).response?.status,
        statusText: (error as any).response?.statusText
      });
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorDetails: error && typeof error === 'object' && 'response' in error ? {
        response: (error as any).response?.data,
        status: (error as any).response?.status,
        statusText: (error as any).response?.statusText
      } : null,
      message: 'Failed to create DocuSign envelope'
    }, { status: 500 });
  }
}
