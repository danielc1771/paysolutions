# PaySolutions Email Templates

This directory contains the HTML email templates for PaySolutions authentication emails, designed to match the professional branding shown in `public/emailref.webp`.

## 📧 Template Overview

The email templates provide a consistent, branded experience for all authentication-related communications:

- **Professional gradient header** with PaySolutions branding
- **"You're almost there!" messaging** matching the reference design
- **Clean, mobile-responsive layout**
- **Security notices** for sensitive operations
- **Consistent typography** and visual hierarchy

## 🎨 Design Features

### Visual Elements:
- Purple-to-blue gradient header background
- PaySolutions logo with white rounded background
- Clean email address display in highlighted boxes
- Professional call-to-action buttons with hover effects
- Subtle shadows and modern styling

### Content Structure:
- Header with logo and company tagline
- Clear headline (e.g., "You're almost there!")
- User email address in styled container
- Company information section with divider
- Prominent action button
- Fallback link for accessibility
- Security notices where appropriate
- Professional footer with legal information

## 📋 Available Templates

1. **Signup Confirmation**
   - Subject: "Welcome to PaySolutions - Confirm Your Account"
   - Used when users create new accounts

2. **Magic Link Login** 
   - Subject: "Your PaySolutions Login Link"
   - Used for passwordless authentication

3. **Password Recovery**
   - Subject: "Reset Your PaySolutions Password"
   - Used when users request password resets

4. **User Invitation**
   - Subject: "You're Invited to Join PaySolutions"
   - Used when admins invite new users

5. **Email Change Confirmation**
   - Subject: "Confirm Your Email Change - PaySolutions"
   - Used when users update their email address

## 🔧 Setup Instructions

### Manual Setup via Supabase Dashboard:

1. **Access Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to **Authentication → Email Templates**

2. **Update Each Template:**
   - Open `email-templates-manual.html` in this directory
   - Copy the HTML for each template type
   - Paste into the corresponding Supabase template section
   - Update the subject line for each template

3. **Template Mappings:**
   - **Confirm signup** → Use "Signup Confirmation" template
   - **Magic Link** → Use "Magic Link Login" template
   - **Reset Password** → Use "Password Recovery" template
   - **Invite user** → Use "User Invitation" template
   - **Change email** → Use "Email Change Confirmation" template

## 🧪 Testing Templates

After setup, test the templates by:

1. **Signup Confirmation:**
   - Create a new account on `/signup`
   - Check email for PaySolutions branding

2. **Password Recovery:**
   - Use "Forgot Password" on `/forgot-password`
   - Verify branded reset email

3. **Magic Link (if enabled):**
   - Use passwordless login
   - Check for branded login email

## 📱 Mobile Compatibility

All templates are fully responsive and include:
- Fluid layouts that adapt to screen sizes
- Touch-friendly button sizing
- Readable typography on mobile devices
- Optimized spacing and padding

## 🔒 Security Features

Templates include appropriate security messaging:
- **24-hour expiration notices** for all links
- **Security warnings** for password reset emails
- **Contact information** for suspicious activity
- **Legal disclaimers** in footer sections

## 🎯 Supabase Variables

All templates properly utilize Supabase template variables:
- `{{ .ConfirmationURL }}` - Main action link
- `{{ .Data.email }}` - User's email address
- `{{ .SiteURL }}` - Application URL
- `{{ .RedirectTo }}` - Redirect destination
- `{{ .TokenHash }}` - Token for custom implementations

## 📝 Maintenance

### Updating Templates:
1. Modify the HTML in `email-templates-manual.html`
2. Copy updated templates to Supabase dashboard
3. Test with new account creation or password reset
4. Verify across different email clients

### Adding New Templates:
1. Follow the existing design pattern
2. Include all required Supabase variables
3. Maintain responsive design principles
4. Add security notices where appropriate
5. Update this README with new template information

## 🎨 Design Reference

The templates are based on the design shown in `public/emailref.webp`, featuring:
- Clean, professional layout
- Prominent branding placement
- Clear call-to-action buttons
- Consistent spacing and typography
- Modern gradient design elements

---

**Last Updated:** January 2025  
**Status:** ✅ Active and deployed  
**Version:** 1.0