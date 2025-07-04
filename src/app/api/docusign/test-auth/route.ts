import { NextResponse } from 'next/server';
import { authenticateWithJWT } from '@/utils/docusign/client';

export async function GET() {
  try {
    console.log('🧪 Testing DocuSign authentication...');
    
    // Test the authentication
    const accessToken = await authenticateWithJWT();
    
    return NextResponse.json({
      success: true,
      message: 'DocuSign authentication successful!',
      tokenLength: accessToken.length,
      tokenPreview: `${accessToken.substring(0, 10)}...`
    });

  } catch (error: unknown) {
    console.error('🚨 Authentication test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: 'Check server console for detailed logs'
    }, { status: 500 });
  }
}
