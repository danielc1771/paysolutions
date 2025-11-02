# Team Invite Flow Setup Guide

## Overview
This guide explains how to properly configure the team invitation flow so that invited users can set their password and access their organization's dashboard.

## Changes Made

### 1. Accept Invite Page (`/src/app/accept-invite/page.tsx`)
- Removed automatic sign-out after password setup
- Added automatic redirect to dashboard after successful password setup
- Users stay logged in after accepting invite

### 2. Middleware (`/src/middleware.ts`)
- Added `/accept-invite` to public routes
- Allows unauthenticated users to access the invite acceptance page

### 3. Login Page (`/src/app/login/page.tsx`)
- Added detection for invite links
- Automatically redirects invite links from `/login` to `/accept-invite`
- Preserves auth tokens in the URL hash

### 4. Auth Callback Route (`/src/app/auth/callback/route.ts`) **NEW**
- Handles Supabase auth redirects
- Exchanges auth code for session
- Detects invite users by checking profile status
- Redirects invited users to `/accept-invite`
- Redirects regular users to dashboard

### 5. Roles Configuration (`/src/lib/auth/roles.ts`)
- Added `/accept-invite` and `/auth/callback` to PUBLIC_ROUTES array

### 6. API Routes Updated
- `/api/team/invite/route.ts` - Now redirects to `/auth/callback?type=invite`
- `/api/admin/users/invite/route.ts` - Now redirects to `/auth/callback?type=invite`

## Supabase Configuration Required

### **CRITICAL: Configure Redirect URLs in Supabase Dashboard**

1. Go to your Supabase Dashboard
2. Navigate to: **Authentication** → **URL Configuration**
3. Add the following to **Redirect URLs** (use the exact URLs for your domains):
   - `http://localhost:3000/auth/callback*` (for local development)
   - `https://ipayus.net/auth/callback*` (for production)
   - `https://www.ipayus.net/auth/callback*` (for www subdomain)
   
**Note**: The wildcard `*` allows query parameters like `?type=invite`

### Email Template Configuration (Optional)

If you want to customize the email template:

1. Go to: **Authentication** → **Email Templates** → **Invite user**
2. Update the confirmation link to use:
   ```
   {{ .ConfirmationURL }}
   ```
   
The `redirectTo` parameter in the API code will handle the redirect to `/accept-invite`.

## How It Works

### Complete Flow:

1. **Organization owner invites team member**
   - Goes to `/dashboard/team`
   - Clicks "Invite Team Member"
   - Enters name and email
   - API creates user with `team_member` role and `INVITED` status
   - Supabase sends invite email with link to `/auth/callback?type=invite`

2. **User receives and clicks invite email**
   - Email contains link: `https://[supabase-url]/auth/v1/verify?token=...&type=invite&redirect_to=https://ipayus.net/auth/callback?type=invite`
   - Supabase verifies the token

3. **Supabase redirects to auth callback**
   - User lands on: `https://ipayus.net/auth/callback?code=...&type=invite`
   - Auth callback route exchanges code for session
   - Checks user profile status (should be `INVITED`)
   - Redirects to `/accept-invite` with active session

4. **User sets password on accept-invite page**
   - Page verifies user has `INVITED` status
   - User enters full name and password
   - Password is set via `updateUser()`
   - Profile status updated to `ACTIVE`

5. **Automatic login and redirect**
   - User stays logged in (no sign-out)
   - Automatically redirected to `/dashboard` after 1.5 seconds
   - User sees their organization's dashboard with `team_member` role permissions

## Testing the Flow

### Local Testing:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Log in as an organization owner

3. Go to `/dashboard/team`

4. Invite a new team member with a test email

5. Check the email inbox for the invite

6. Click the invite link

7. Verify you're redirected to `/accept-invite`

8. Set password and verify redirect to dashboard

### Troubleshooting:

**Issue**: Redirected to `/login` instead of `/accept-invite`
- **Solution**: The login page now auto-detects invite links and redirects. This should work automatically.

**Issue**: "Invalid redirect URL" error
- **Solution**: Add the redirect URL to Supabase Dashboard → Authentication → URL Configuration

**Issue**: User can't access dashboard after accepting invite
- **Solution**: Check that user's profile has `status: 'ACTIVE'` and correct `organization_id`

**Issue**: Email not received
- **Solution**: Check Supabase logs and verify email service is configured

## Security Notes

- Invite links expire after a set time (configured in Supabase)
- Users with `INVITED` status cannot log in until they set a password
- Team members can only access their own organization's data
- The invite flow uses secure Supabase Auth tokens

## Role Permissions

Team members (`team_member` role) have access to:
- `/dashboard` - Main dashboard
- `/dashboard/loans` - View and create loans
- `/dashboard/borrowers` - View and manage borrowers
- `/dashboard/reports` - View reports
- `/dashboard/settings` - Account settings

Team members **cannot** access:
- `/dashboard/team` - Team management (owner/user only)
- `/admin/*` - Admin routes

## Support

If you encounter issues with the invite flow:
1. Check Supabase logs for errors
2. Verify redirect URLs are configured
3. Check browser console for JavaScript errors
4. Verify user profile has correct `organization_id` and `role`
