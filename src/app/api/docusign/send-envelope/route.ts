import { NextRequest, NextResponse } from 'next/server';
import { sendEnvelopeWithConfig, sendEnvelopeFromTemplate } from '@/utils/docusign/client';

// Example API route to send envelope from template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signerEmail, signerName, templateId, ccEmail, ccName } = body;

    // Validate required fields
    if (!signerEmail || !signerName) {
      return NextResponse.json(
        { error: 'signerEmail and signerName are required' },
        { status: 400 }
      );
    }

    // Send envelope using the convenience function
    const result = await sendEnvelopeWithConfig(
      signerEmail,
      signerName,
      templateId, // Optional - will use default if not provided
      ccEmail,    // Optional
      ccName      // Optional
    );

    console.log('✅ Envelope sent successfully:', result);

    return NextResponse.json({
      success: true,
      envelopeId: result.envelopeId,
      uri: (result as any).uri,
      status: (result as any).status,
      statusDateTime: (result as any).statusDateTime
    });

  } catch (error) {
    console.error('❌ Failed to send envelope:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send envelope',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Example usage with custom configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      signerEmail, 
      signerName, 
      templateId,
      ccEmail, 
      ccName,
      basePath,
      accessToken,
      accountId 
    } = body;

    // Validate required fields
    if (!signerEmail || !signerName || !templateId || !basePath || !accessToken || !accountId) {
      return NextResponse.json(
        { error: 'Missing required fields: signerEmail, signerName, templateId, basePath, accessToken, accountId' },
        { status: 400 }
      );
    }

    // Send envelope using the full configuration function
    const result = await sendEnvelopeFromTemplate({
      basePath,
      accessToken,
      accountId,
      envelopeArgs: {
        signerEmail,
        signerName,
        templateId,
        ccEmail,
        ccName
      }
    });

    console.log('✅ Envelope sent successfully with custom config:', result);

    return NextResponse.json({
      success: true,
      envelopeId: result.envelopeId,
      uri: (result as any).uri,
      status: (result as any).status,
      statusDateTime: (result as any).statusDateTime
    });

  } catch (error) {
    console.error('❌ Failed to send envelope with custom config:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send envelope',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
