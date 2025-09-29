import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/utils/docusign/client';

export async function GET(request: NextRequest) {
  try {
    const redirectUri = new URL('/api/auth/docusign/callback', request.url).toString();
    const state = 'docusign_auth_' + Math.random().toString(36).substring(7); // CSRF protection
    
    const authUrl = getAuthorizationUrl(redirectUri, state);
    
    console.log('🔗 Redirecting to DocuSign authorization:', authUrl);
    
    return NextResponse.redirect(authUrl);
    
  } catch (error) {
    console.error('❌ Failed to generate authorization URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate authorization URL';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
