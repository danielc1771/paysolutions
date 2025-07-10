# Twilio Phone Verification Setup Guide

## Step 1: Create Twilio Account

1. Go to https://www.twilio.com/
2. Sign up for a free account
3. Verify your email address and phone number

## Step 2: Get Account Credentials

1. Log into your Twilio Console
2. Go to **Account Dashboard**
3. Note your **Account SID** and **Auth Token**

## Step 3: Create Verify Service

1. In the Twilio Console, navigate to **Verify** → **Services**
2. Click **Create new Service**
3. Fill out the form:
   - **Friendly Name**: PaySolutions Phone Verification
   - **Code Length**: 6 (default)
   - **Lookup**: Enable (recommended)
   - **PSD2**: Disable (unless required)
4. Click **Create**
5. Copy the **Service SID** (starts with "VA")

## Step 4: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here  
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid_here
```

## Step 5: Database Schema Updates

Run the following SQL to add phone verification columns to your database:

```sql
-- Add phone verification enum
DO $$ BEGIN
    CREATE TYPE phone_verification_status AS ENUM ('pending', 'sent', 'verified', 'failed', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add phone verification columns to loans table
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS phone_verification_session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone_verification_status phone_verification_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verified_phone_number VARCHAR(20);

-- Create index for phone verification session lookups
CREATE INDEX IF NOT EXISTS idx_loans_phone_verification_session_id 
ON loans(phone_verification_session_id) 
WHERE phone_verification_session_id IS NOT NULL;
```

Or use Drizzle commands:
```bash
npm run db:generate
npm run db:migrate
```

## Step 6: Webhook Configuration (Optional)

For real-time status updates:

1. In Twilio Console, go to **Verify** → **Services** → Your Service
2. Click **Webhooks**
3. Add webhook URL: `https://yourdomain.com/api/twilio/webhook`
4. Select events:
   - `verification.approved`
   - `verification.expired` 
   - `verification.canceled`
   - `verification.max-attempts-reached`

## Step 7: Testing

### Test Phone Numbers (Development)
Twilio provides test numbers for development:
- `+15005550006` - Valid mobile number
- `+15005550001` - Invalid number
- `+15005550007` - Number that can't receive SMS

### Test Verification Codes
For test numbers, use these codes:
- Any 6-digit code works with test numbers in development

## Features Implemented

✅ **Phone Number Input**: Users can enter/edit phone numbers
✅ **SMS Verification**: 6-digit codes sent via Twilio Verify
✅ **Real-time Updates**: Status updates via Supabase subscriptions  
✅ **Error Handling**: Proper error messages for failed verifications
✅ **Resend Functionality**: Users can request new codes
✅ **Progress Blocking**: Users cannot proceed until verified
✅ **Database Tracking**: All verification attempts logged

## Security Features

- **E.164 Format**: Phone numbers automatically formatted
- **Webhook Signatures**: Twilio webhooks verified for authenticity
- **Rate Limiting**: Twilio handles sending rate limits
- **Code Expiry**: Verification codes expire after 10 minutes
- **Attempt Limits**: Maximum verification attempts enforced

## Phone Verification Flow

1. **Step 1**: User enters phone number (pre-filled if available)
2. **Step 2**: System sends SMS via Twilio Verify API
3. **Step 3**: User enters 6-digit verification code
4. **Step 4**: System verifies code with Twilio
5. **Step 5**: Real-time status update via webhook (optional)
6. **Step 6**: User can proceed to next application step

## Troubleshooting

### Common Issues

**"Invalid phone number format"**
- Ensure phone number includes country code
- US numbers: +1 prefix added automatically

**"Failed to send verification code"**
- Check Twilio credentials in environment variables
- Verify Twilio service is active
- Check account balance for paid accounts

**"Webhook signature verification failed"**
- Ensure webhook URL is HTTPS in production
- Check that TWILIO_AUTH_TOKEN is correct

### Testing in Development

1. Use a real phone number for testing
2. Check Twilio Console logs for detailed error messages
3. Monitor application logs for debugging information
4. Test with different phone number formats

## Production Checklist

- [ ] Twilio account upgraded from trial (if needed)
- [ ] Production webhook URL configured
- [ ] Database schema updated
- [ ] Environment variables set
- [ ] Phone number validation tested
- [ ] SMS delivery tested in target regions