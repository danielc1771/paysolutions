import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const path = request.nextUrl.pathname
  const hash = request.nextUrl.hash

  // Check if this is an invite link being redirected to /login
  // If so, redirect to /accept-invite instead
  if (path === '/login' && hash.includes('type=invite')) {
    const url = new URL(request.url)
    url.pathname = '/accept-invite'
    return NextResponse.redirect(url)
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/accept-invite',
    '/auth/callback',
    '/apply/',
    '/payment-setup',
    '/payment-collection/',
    '/payment-summary/'
  ]
  
  const isPublic = publicRoutes.some(route => {
    if (route.endsWith('/')) {
      return path.startsWith(route)
    }
    return path === route
  })

  // Allow public routes without authentication
  if (isPublic) {
    return response
  }

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  // If not authenticated and trying to access protected routes, redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Handle authenticated user route access
  // For better performance, we'll do role checking in the actual page components
  // rather than in middleware to avoid database queries on every request

  // Handle root path - redirect based on user role
  if (path === '/') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // For authenticated users, let the layout handle role-based redirect to /dashboard
    return NextResponse.next()
  }

  // Handle login redirect for authenticated users
  if (path === '/login') {
    // For authenticated users, let layout handle role-based redirect
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Basic route protection - dashboard and borrower routes require authentication
  if (path.startsWith('/dashboard') || path.startsWith('/borrower')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/stripe/webhook (Stripe webhook endpoint)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}