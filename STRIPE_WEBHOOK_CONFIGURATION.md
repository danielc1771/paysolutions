# Stripe Webhook Configuration Guide

## Current Status
- **Production Domain**: Use your production domain (e.g., `https://your-domain.com`)
- **Webhook Endpoint**: `https://your-domain.com/api/stripe/webhook`
- **Webhook Secret**: Configure in Stripe Dashboard (starts with `whsec_`)

## Step-by-Step Configuration

### 1. Check Current Webhook Configuration in Stripe Dashboard

1. **Login to Stripe Dashboard**
   - Go to https://dashboard.stripe.com
   - Ensure you're in **Live mode** (not Test mode)

2. **Navigate to Webhooks**
   - Click on "Developers" in the left sidebar
   - Click on "Webhooks"

3. **Check Existing Endpoints**
   - Look for any existing webhook endpoints
   - Check if there's an endpoint pointing to your production domain

### 2. Configure/Update Webhook Endpoint

**If no webhook exists or wrong domain:**

1. **Create New Webhook**
   - Click "Add endpoint"
   - Enter URL: `https://your-domain.com/api/stripe/webhook`
   - Description: "iPayUS Production Webhook"

2. **Select Events to Listen For**
   ```
   ✅ identity.verification_session.canceled
   ✅ identity.verification_session.processing
   ✅ identity.verification_session.requires_input
   ✅ identity.verification_session.verified
   ✅ payment_intent.succeeded
   ✅ payment_intent.payment_failed
   ✅ setup_intent.succeeded
   ✅ customer.created
   ✅ customer.updated
   ✅ invoice.payment_succeeded
   ✅ invoice.payment_failed
   ```

3. **Save the Endpoint**
   - Click "Add endpoint"
   - Copy the **Webhook Secret** (starts with `whsec_`)

### 3. Update Environment Variables

**In your Vercel Dashboard:**

1. Go to https://vercel.com/dashboard
2. Select your `paysolutions` project
3. Go to "Settings" → "Environment Variables"
4. Update or add:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_YOUR_NEW_SECRET_HERE
   ```
5. **Important**: Redeploy your application after updating

### 4. Test Webhook Configuration

**Method 1: Using Stripe CLI (Recommended)**
```bash
# Install Stripe CLI if not already installed
# Mac: brew install stripe/stripe-cli/stripe
# Windows: Download from https://github.com/stripe/stripe-cli/releases

# Login to Stripe
stripe login

# Test webhook endpoint
stripe listen --forward-to https://your-domain.com/api/stripe/webhook

# In another terminal, trigger test events
stripe trigger identity.verification_session.verified
stripe trigger payment_intent.succeeded
```

**Method 2: Using Stripe Dashboard**
1. Go to your webhook endpoint in Stripe Dashboard
2. Click "Send test webhook"
3. Select an event type (e.g., `identity.verification_session.verified`)
4. Click "Send test webhook"

### 5. Monitor Webhook Logs

**Check Vercel Logs:**
```bash
# Install Vercel CLI
npm i -g vercel

# View real-time logs
vercel logs --follow
```

**Check Stripe Dashboard:**
1. Go to your webhook endpoint
2. Click on "Recent deliveries"
3. Look for successful (200) and failed responses

### 6. Verify Domain Configuration

**Check these items:**

1. **SSL Certificate**
   - Visit https://your-domain.com
   - Ensure the padlock icon shows secure connection
   - Certificate should be valid and not self-signed

2. **Endpoint Accessibility**
   - Test: `curl -X POST https://your-domain.com/api/stripe/webhook`
   - Should return 400 (signature verification failed) - this is expected

3. **Environment Variables**
   - Verify in Vercel Dashboard → Settings → Environment Variables
   - Ensure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set

### 7. Common Issues and Solutions

**Issue: "Webhook signature verification failed"**
- **Cause**: Wrong webhook secret or signature issues
- **Solution**: 
  1. Get new webhook secret from Stripe Dashboard
  2. Update `STRIPE_WEBHOOK_SECRET` in Vercel
  3. Redeploy application

**Issue: "Failed to retrieve verification session"**
- **Cause**: API key issues or network problems
- **Solution**:
  1. Check `STRIPE_SECRET_KEY` is correct and for Live mode
  2. Verify API version compatibility (currently using 2025-06-30.basil)

**Issue: "Webhook timeouts"**
- **Cause**: Slow response from your endpoint
- **Solution**: 
  1. Optimize database queries
  2. Implement asynchronous processing
  3. Return 200 response quickly

### 8. Security Best Practices

1. **Always verify webhook signatures**
   - ✅ Already implemented in code
   - Uses `stripe.webhooks.constructEvent()`

2. **Use HTTPS only**
   - ✅ Production domain uses HTTPS
   - Stripe requires HTTPS for webhooks

3. **Implement idempotency**
   - Log event IDs to prevent duplicate processing
   - Use database transactions for critical operations

4. **Monitor webhook failures**
   - Set up alerts for failed webhooks
   - Check Stripe Dashboard regularly

### 9. Testing Checklist

- [ ] Webhook endpoint responds with 200 for valid requests
- [ ] Webhook endpoint responds with 400 for invalid signatures
- [ ] Identity verification events update loan status in database
- [ ] Payment events are logged correctly
- [ ] All required events are configured in Stripe Dashboard
- [ ] Environment variables are set correctly in Vercel
- [ ] SSL certificate is valid
- [ ] Webhook secret matches between Stripe and Vercel

### 10. Emergency Rollback

If webhooks fail:
1. **Disable webhook in Stripe Dashboard**
2. **Revert to previous webhook secret**
3. **Check Vercel logs for errors**
4. **Contact Stripe support if needed**

## Current Implementation Status

✅ **Webhook handler**: `/api/stripe/webhook/route.ts`
✅ **Identity verification events**: Implemented
✅ **Database integration**: Updates loan status
✅ **Comprehensive logging**: Added
✅ **Error handling**: Implemented
✅ **Security**: Signature verification enabled

## Next Steps

1. **Run the configuration steps above**
2. **Test webhook functionality**
3. **Monitor logs for issues**
4. **Set up monitoring/alerts**