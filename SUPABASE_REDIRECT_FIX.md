# Supabase Invite Redirect Fix - Complete Solution

## Problem Analysis

### What Was Happening:
1. User clicks invite email link: `https://mrbsllbyiiknsjohqwph.supabase.co/auth/v1/verify?token=...&type=invite&redirect_to=https://ipayus.net`
2. Supabase verifies token and redirects to: `https://www.ipayus.net/login`
3. **Problem**: No auth tokens in URL, so we couldn't detect it was an invite

### Root Cause:
- Supabase's PKCE flow requires a proper callback route to exchange the auth code for a session
- Direct redirects to `/accept-invite` don't work because the session isn't established yet
- The `redirect_to` parameter needs to point to a route that handles the OAuth callback

## Solution: Auth Callback Route

### What We Implemented:

Created `/src/app/auth/callback/route.ts` - a server-side route that:
1. Receives the auth code from Supabase
2. Exchanges it for a session using `exchangeCodeForSession()`
3. Checks if user has `INVITED` status in their profile
4. Redirects invited users to `/accept-invite` with an active session
5. Redirects regular users to dashboard

### Updated Files:

1. **`/src/app/auth/callback/route.ts`** (NEW)
   - Server-side auth callback handler
   - Exchanges code for session
   - Routes users based on invite status

2. **`/src/app/api/team/invite/route.ts`**
   - Changed: `redirectTo: ${SITE_URL}/accept-invite`
   - To: `redirectTo: ${SITE_URL}/auth/callback?type=invite`

3. **`/src/app/api/admin/users/invite/route.ts`**
   - Changed: `redirectTo: ${SITE_URL}/accept-invite`
   - To: `redirectTo: ${SITE_URL}/auth/callback?type=invite`

4. **`/src/middleware.ts`**
   - Added `/auth/callback` to public routes

5. **`/src/lib/auth/roles.ts`**
   - Added `/auth/callback` to PUBLIC_ROUTES

## Critical: Supabase Dashboard Configuration

### You MUST Configure These URLs in Supabase:

1. Go to: **Supabase Dashboard** → **Authentication** → **URL Configuration**

2. Under **Redirect URLs**, add:
   ```
   http://localhost:3000/auth/callback*
   https://ipayus.net/auth/callback*
   https://www.ipayus.net/auth/callback*
   ```

3. **Important Notes:**
   - The `*` wildcard allows query parameters like `?type=invite&code=...`
   - Add both `ipayus.net` AND `www.ipayus.net` if you use both
   - Without these URLs, Supabase will reject the redirect

### How to Add Redirect URLs:

```
1. Login to Supabase Dashboard
2. Select your project
3. Go to Authentication (left sidebar)
4. Click "URL Configuration"
5. Scroll to "Redirect URLs"
6. Click "Add URL"
7. Paste each URL above (one at a time)
8. Click "Save"
```

## New Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Organization Owner Invites Team Member                   │
│    POST /api/team/invite                                     │
│    → Creates user with INVITED status                        │
│    → Supabase sends email                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. User Clicks Email Link                                   │
│    https://[supabase]/auth/v1/verify?                        │
│      token=xxx&                                              │
│      type=invite&                                            │
│      redirect_to=https://ipayus.net/auth/callback?type=invite│
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Supabase Verifies Token & Redirects                      │
│    → Validates token                                         │
│    → Generates auth code                                     │
│    → Redirects to: https://ipayus.net/auth/callback?        │
│      code=xxx&type=invite                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Auth Callback Route (SERVER-SIDE)                        │
│    GET /auth/callback?code=xxx&type=invite                  │
│    → Exchanges code for session                              │
│    → Checks profile.status === 'INVITED'                     │
│    → Sets session cookies                                    │
│    → Redirects to /accept-invite                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Accept Invite Page (CLIENT-SIDE)                         │
│    GET /accept-invite                                        │
│    → User already has active session                         │
│    → Verifies status === 'INVITED'                           │
│    → Shows password setup form                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. User Sets Password                                        │
│    → updateUser({ password })                                │
│    → Update profile: status = 'ACTIVE'                       │
│    → Stay logged in                                          │
│    → Redirect to /dashboard                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. User Accesses Dashboard                                  │
│    → Logged in with team_member role                         │
│    → Can access organization data                            │
│    → Full dashboard access                                   │
└─────────────────────────────────────────────────────────────┘
```

## Testing Steps

### 1. Configure Supabase (FIRST!)
- Add redirect URLs to Supabase Dashboard (see above)

### 2. Test Locally
```bash
# Start dev server
npm run dev

# In browser:
1. Login as organization owner
2. Go to http://localhost:3000/dashboard/team
3. Click "Invite Team Member"
4. Enter test email
5. Check email inbox
6. Click invite link
7. Should redirect to: http://localhost:3000/accept-invite
8. Set password
9. Should redirect to: http://localhost:3000/dashboard
```

### 3. Test Production
```bash
# After deploying to production:
1. Login to https://ipayus.net
2. Go to /dashboard/team
3. Invite team member
4. Check email
5. Click link
6. Should go to: https://ipayus.net/accept-invite
7. Complete password setup
8. Should access dashboard
```

## Troubleshooting

### Issue: "Invalid redirect URL" error
**Cause**: Redirect URL not configured in Supabase
**Fix**: Add `https://ipayus.net/auth/callback*` to Supabase Dashboard → Authentication → URL Configuration

### Issue: Redirected to /login instead of /accept-invite
**Cause**: Auth callback not working
**Fix**: 
1. Check Supabase redirect URLs are configured
2. Check `/auth/callback` route exists
3. Check middleware allows `/auth/callback`
4. Check browser console for errors

### Issue: "Session not found" on /accept-invite
**Cause**: Session not being set by auth callback
**Fix**:
1. Check auth callback route is exchanging code properly
2. Check cookies are being set
3. Try clearing browser cookies and testing again

### Issue: User can't access dashboard after accepting invite
**Cause**: Profile status not updated to ACTIVE
**Fix**:
1. Check database: `SELECT * FROM profiles WHERE email = 'user@email.com'`
2. Verify status is 'ACTIVE'
3. Verify organization_id is set correctly

## Environment Variables

Make sure these are set:

```bash
# .env.local (development)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Production (Vercel)
NEXT_PUBLIC_SITE_URL=https://ipayus.net
```

## Deployment Checklist

- [ ] Deploy code changes to production
- [ ] Add redirect URLs to Supabase Dashboard
- [ ] Test invite flow end-to-end
- [ ] Verify user can access dashboard after accepting
- [ ] Check user has correct organization_id and role

## Why This Solution Works

1. **Proper OAuth Flow**: Uses Supabase's PKCE flow correctly
2. **Server-Side Session**: Session is established server-side before redirecting
3. **Status Check**: Verifies user is invited before showing password form
4. **Secure**: Uses Supabase's built-in security mechanisms
5. **Reliable**: Works across all browsers and doesn't rely on URL hash

## Key Differences from Previous Approach

| Previous | New |
|----------|-----|
| Redirect to `/accept-invite` directly | Redirect to `/auth/callback` first |
| Try to parse tokens from URL hash | Exchange code for session server-side |
| Client-side session handling | Server-side session handling |
| Unreliable across browsers | Works everywhere |

## Support

If issues persist:
1. Check Supabase logs for errors
2. Check browser console for JavaScript errors
3. Verify all redirect URLs are configured
4. Test with a fresh incognito window
5. Check database to verify user profile exists with correct status
