'use server';

import Stripe from 'stripe';
import { createClient as createAdminClient } from '@/utils/supabase/admin';

// Use the verification Stripe keys (may be test mode)
const stripe = new Stripe(
  process.env.STRIPE_VERIFICATION_SECRET_KEY || process.env.STRIPE_SECRET_KEY!,
  { apiVersion: '2025-09-30.clover' }
);

// Get the metered price ID from environment
const VERIFICATION_PRICE_ID = process.env.STRIPE_VERIFICATION_PRICE_ID;

interface CreateSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  subscriptionItemId?: string;
  error?: string;
}

interface ReportUsageResult {
  success: boolean;
  usageRecordId?: string;
  error?: string;
}

interface UsageStats {
  currentPeriodUsage: number;
  totalUsage: number;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
}

/**
 * Create or get a Stripe customer for an organization
 */
export async function getOrCreateStripeCustomer(
  organizationId: string,
  organizationName: string,
  organizationEmail?: string
): Promise<string> {
  const supabase = await createAdminClient();

  // Check if org already has a Stripe customer ID
  const { data: org } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', organizationId)
    .single();

  if (org?.stripe_customer_id) {
    return org.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    name: organizationName,
    email: organizationEmail || undefined,
    metadata: {
      organization_id: organizationId,
    },
  });

  // Save customer ID to organization
  await supabase
    .from('organizations')
    .update({ stripe_customer_id: customer.id })
    .eq('id', organizationId);

  return customer.id;
}

/**
 * Create a metered subscription for verification billing
 */
export async function createVerificationSubscription(
  organizationId: string
): Promise<CreateSubscriptionResult> {
  if (!VERIFICATION_PRICE_ID) {
    return {
      success: false,
      error: 'Verification price ID not configured. Please set STRIPE_VERIFICATION_PRICE_ID.',
    };
  }

  try {
    const supabase = await createAdminClient();

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, email, stripe_verification_subscription_id')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return { success: false, error: 'Organization not found' };
    }

    // Check if subscription already exists
    if (org.stripe_verification_subscription_id) {
      // Verify subscription is still active
      try {
        const existingSub = await stripe.subscriptions.retrieve(
          org.stripe_verification_subscription_id
        );
        if (existingSub.status === 'active') {
          return {
            success: true,
            subscriptionId: existingSub.id,
            subscriptionItemId: existingSub.items.data[0]?.id,
          };
        }
      } catch {
        // Subscription doesn't exist anymore, create new one
      }
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      organizationId,
      org.name,
      org.email || undefined
    );

    // Create subscription with metered billing
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: VERIFICATION_PRICE_ID,
        },
      ],
      metadata: {
        organization_id: organizationId,
        type: 'verification_billing',
      },
    });

    const subscriptionItemId = subscription.items.data[0]?.id;

    // Save subscription details to organization
    await supabase
      .from('organizations')
      .update({
        stripe_verification_subscription_id: subscription.id,
        stripe_verification_subscription_item_id: subscriptionItemId,
        stripe_verification_price_id: VERIFICATION_PRICE_ID,
        verification_billing_status: 'active',
      })
      .eq('id', organizationId);

    return {
      success: true,
      subscriptionId: subscription.id,
      subscriptionItemId,
    };
  } catch (error) {
    console.error('Error creating verification subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create subscription',
    };
  }
}

/**
 * Report verification usage to Stripe
 * Call this when a verification is completed
 * Always records usage in our database (for display), but only reports to Stripe if billing is active
 */
export async function reportVerificationUsage(
  organizationId: string,
  verificationId: string,
  quantity: number = 1
): Promise<ReportUsageResult> {
  try {
    const supabase = await createAdminClient();

    console.log('📊 reportVerificationUsage called:', { organizationId, verificationId, quantity });

    // Check if this verification was already recorded
    const { data: existingUsage } = await supabase
      .from('verification_usage')
      .select('id')
      .eq('verification_id', verificationId)
      .single();

    if (existingUsage) {
      console.log('📊 Usage already recorded for verification:', verificationId);
      return { success: true, error: 'Already reported' };
    }

    // Get organization's subscription item ID
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_verification_subscription_item_id, verification_billing_status, stripe_customer_id')
      .eq('id', organizationId)
      .single();

    console.log('📊 Organization billing status:', {
      hasSubscription: !!org?.stripe_verification_subscription_item_id,
      billingStatus: org?.verification_billing_status
    });

    let stripeUsageRecordId: string | null = null;

    // Only report to Stripe if billing is active
    // Uses modern Billing Meter Events API (not legacy usage records)
    // Ref: https://docs.stripe.com/billing/subscriptions/usage-based/recording-usage-api
    if (org?.stripe_customer_id && org.verification_billing_status === 'active') {
      try {
        // POST /v1/billing/meter_events
        const meterEvent = await stripe.billing.meterEvents.create({
          event_name: 'verification_completed', // Must match your meter's event name in Stripe Dashboard
          payload: {
            stripe_customer_id: org.stripe_customer_id,
            value: quantity.toString(), // Whole number as string
          },
          timestamp: Math.floor(Date.now() / 1000),
        });
        stripeUsageRecordId = meterEvent.identifier;
        console.log('📊 Reported usage to Stripe via Meter Events API:', meterEvent.identifier);
      } catch (stripeError) {
        console.error('Error reporting to Stripe (will still record locally):', stripeError);
      }
    } else {
      console.log('📊 Billing not active, skipping Stripe report but recording locally');
    }

    // Always record usage in our database (for display and future billing)
    const { error: insertError } = await supabase.from('verification_usage').insert({
      organization_id: organizationId,
      verification_id: verificationId,
      stripe_usage_record_id: stripeUsageRecordId,
      reported_at: new Date().toISOString(),
      quantity,
    });

    if (insertError) {
      console.error('Error inserting usage record:', insertError);
      return { success: false, error: insertError.message };
    }

    console.log('📊 Usage recorded successfully');

    return {
      success: true,
      usageRecordId: stripeUsageRecordId || undefined,
    };
  } catch (error) {
    console.error('Error reporting verification usage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to report usage',
    };
  }
}

/**
 * Get verification usage statistics for an organization
 */
export async function getVerificationUsageStats(
  organizationId: string
): Promise<UsageStats> {
  try {
    const supabase = await createAdminClient();

    console.log('📊 Getting usage stats for org:', organizationId);

    // Get org subscription
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_verification_subscription_id')
      .eq('id', organizationId)
      .single();

    let billingPeriodStart: Date | null = null;
    let billingPeriodEnd: Date | null = null;
    let currentPeriodUsage = 0;

    // If there's an active subscription, get billing period from Stripe
    if (org?.stripe_verification_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          org.stripe_verification_subscription_id
        );

        // Safely parse dates from Stripe subscription
        // Use type assertion to access period dates (Stripe API version differences)
        const subData = subscription as unknown as { current_period_start: number; current_period_end: number };
        const periodStart = subData.current_period_start;
        const periodEnd = subData.current_period_end;

        if (periodStart && periodEnd) {
          const startTimestamp = periodStart * 1000;
          const endTimestamp = periodEnd * 1000;

          // Validate timestamps before creating Date objects
          if (!isNaN(startTimestamp) && !isNaN(endTimestamp)) {
            billingPeriodStart = new Date(startTimestamp);
            billingPeriodEnd = new Date(endTimestamp);

            // Verify dates are valid
            if (isNaN(billingPeriodStart.getTime()) || isNaN(billingPeriodEnd.getTime())) {
              billingPeriodStart = null;
              billingPeriodEnd = null;
            } else {
              // Get usage for current period from our database
              const { count } = await supabase
                .from('verification_usage')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organizationId)
                .gte('reported_at', billingPeriodStart.toISOString())
                .lte('reported_at', billingPeriodEnd.toISOString());

              currentPeriodUsage = count || 0;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    } else {
      // No subscription - use current month as "period" for display
      const now = new Date();
      billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Get usage for current month
      const { count } = await supabase
        .from('verification_usage')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('reported_at', billingPeriodStart.toISOString())
        .lte('reported_at', billingPeriodEnd.toISOString());

      currentPeriodUsage = count || 0;
    }

    // Get total usage
    const { count: totalCount } = await supabase
      .from('verification_usage')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    console.log('📊 Usage stats:', {
      currentPeriodUsage,
      totalUsage: totalCount || 0,
      billingPeriodStart: billingPeriodStart?.toISOString(),
      billingPeriodEnd: billingPeriodEnd?.toISOString(),
    });

    return {
      currentPeriodUsage,
      totalUsage: totalCount || 0,
      billingPeriodStart,
      billingPeriodEnd,
    };
  } catch (error) {
    console.error('Error getting usage stats:', error);
    return {
      currentPeriodUsage: 0,
      totalUsage: 0,
      billingPeriodStart: null,
      billingPeriodEnd: null,
    };
  }
}

/**
 * Cancel verification subscription
 */
export async function cancelVerificationSubscription(
  organizationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createAdminClient();

    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_verification_subscription_id')
      .eq('id', organizationId)
      .single();

    if (!org?.stripe_verification_subscription_id) {
      return { success: true };
    }

    await stripe.subscriptions.cancel(org.stripe_verification_subscription_id);

    await supabase
      .from('organizations')
      .update({
        verification_billing_status: 'canceled',
      })
      .eq('id', organizationId);

    return { success: true };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel subscription',
    };
  }
}
