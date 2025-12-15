import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const type = requestUrl.searchParams.get('type')

  console.log('auth/callback reached:', { url: request.url, code: !!code, type, next });

  // Check for invite type first - if using implicit flow (hash), we won't see a code here
  // but we should still redirect to the accept-invite page where the client can handle the hash
  if (type === 'invite' || type === 'recovery') {
    const target = type === 'recovery' ? '/update-password' : '/accept-invite';
    return NextResponse.redirect(`${requestUrl.origin}${target}`)
  }

  if (code) {
    const supabase = await createClient()

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    if (data.user) {
      // Check if this is an invite by looking at user metadata or profile status
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('id', data.user.id)
        .single()

      console.log('auth/callback profile check:', {
        userId: data.user.id,
        profileStatus: profile?.status,
        typeParam: type
      });

      // If user status is INVITED or type is invite, redirect to accept-invite
      if (profile?.status === 'INVITED' || type === 'invite') {
        return NextResponse.redirect(`${requestUrl.origin}/accept-invite`)
      }

      // Otherwise, redirect to the next URL or dashboard
      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  // If no code, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}
