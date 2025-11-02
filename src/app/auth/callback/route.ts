import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const type = requestUrl.searchParams.get('type')

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
