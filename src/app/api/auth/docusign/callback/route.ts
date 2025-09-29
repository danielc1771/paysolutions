import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, setTokenData } from '@/utils/docusign/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('🔐 DocuSign OAuth callback received:', { code: !!code, state, error });

  if (error) {
    console.error('❌ DocuSign OAuth error:', error);
    return NextResponse.redirect(new URL(`/error?message=${encodeURIComponent('DocuSign authorization failed: ' + error)}`, request.url));
  }

  if (!code) {
    console.error('❌ No authorization code received');
    return NextResponse.redirect(new URL('/error?message=No authorization code received', request.url));
  }

  try {
    // Exchange the authorization code for access token
    const redirectUri = new URL('/api/auth/docusign/callback', request.url).toString();
    const tokenData = await exchangeCodeForToken(code, redirectUri);
    
    // Store the token data (in production, you'd store this securely)
    setTokenData(tokenData);
    
    console.log('✅ DocuSign OAuth successful, tokens stored');
    
    // Redirect to a success page or back to the application
    // You can customize this redirect based on the state parameter
    const successUrl = state ? `/success?state=${state}` : '/admin/docusign-success';
    return NextResponse.redirect(new URL(successUrl, request.url));
    
  } catch (error) {
    console.error('❌ Token exchange failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Token exchange failed';
    return NextResponse.redirect(new URL(`/error?message=${encodeURIComponent(errorMessage)}`, request.url));
  }
}
