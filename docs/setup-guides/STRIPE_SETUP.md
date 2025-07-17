# Stripe Payment Setup Configuration

## Required Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key (test or live)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Your Stripe publishable key (test or live)
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Your site URL for redirects
```

## How to Get Stripe Keys

1. **Sign up for Stripe**: Go to [https://stripe.com](https://stripe.com) and create an account
2. **Get API Keys**: 
   - Go to your Stripe Dashboard
   - Navigate to "Developers" → "API keys"
   - Copy your "Publishable key" and "Secret key"
   - Use test keys for development (they start with `pk_test_` and `sk_test_`)

## Database Schema Updates

The following columns should be added to your database tables:

### `borrowers` table:
```sql
ALTER TABLE borrowers ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE borrowers ADD COLUMN stripe_payment_method_id VARCHAR(255);
ALTER TABLE borrowers ADD COLUMN payment_setup_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE borrowers ADD COLUMN payment_setup_completed_at TIMESTAMP;
```

### `loans` table:
```sql
ALTER TABLE loans ADD COLUMN stripe_subscription_id VARCHAR(255);
ALTER TABLE loans ADD COLUMN payment_collection_active BOOLEAN DEFAULT FALSE;
ALTER TABLE loans ADD COLUMN payment_collection_started_at TIMESTAMP;
```

## Payment Flow

1. **Loan Approval**: When a loan is approved and funded, the "Loan Approved & Funded" component appears at the top
2. **Payment Setup**: User clicks "Setup Payment Collection" button
3. **Stripe Integration**: User is redirected to `/payment-setup` page to enter card details
4. **Subscription Creation**: Once payment method is saved, a recurring subscription is created
5. **Automatic Payments**: Stripe automatically charges the customer monthly according to the loan terms

## Testing

1. Use Stripe test cards for testing:
   - Success: `4242424242424242`
   - Decline: `4000000000000002`
   - More test cards: [https://stripe.com/docs/testing](https://stripe.com/docs/testing)

2. Monitor payments in your Stripe Dashboard under "Payments" and "Subscriptions"

## Security Notes

- Never commit your secret keys to version control
- Use test keys for development
- Use live keys only in production
- The secret key should only be used on the server-side
- The publishable key can be used on the client-side
