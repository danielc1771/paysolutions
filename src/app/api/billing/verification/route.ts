import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import {
  getVerificationUsageStats,
  createVerificationSubscription,
  cancelVerificationSubscription,
} from '@/utils/stripe/verification-billing';

// GET - Get verification billing status and usage
export async function GET() {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only organization owners and admins can view billing
    if (!['admin', 'organization_owner'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get organization billing details
    const { data: org } = await adminClient
      .from('organizations')
      .select(`
        stripe_verification_subscription_id,
        stripe_verification_subscription_item_id,
        stripe_verification_price_id,
        verification_billing_status
      `)
      .eq('id', profile.organization_id)
      .single();

    // Get usage stats
    const usageStats = await getVerificationUsageStats(profile.organization_id);

    // Safely convert dates to ISO strings
    let billingPeriodStartStr: string | null = null;
    let billingPeriodEndStr: string | null = null;

    try {
      if (usageStats.billingPeriodStart && !isNaN(usageStats.billingPeriodStart.getTime())) {
        billingPeriodStartStr = usageStats.billingPeriodStart.toISOString();
      }
      if (usageStats.billingPeriodEnd && !isNaN(usageStats.billingPeriodEnd.getTime())) {
        billingPeriodEndStr = usageStats.billingPeriodEnd.toISOString();
      }
    } catch {
      // Dates are invalid, leave as null
    }

    return NextResponse.json({
      success: true,
      billing: {
        status: org?.verification_billing_status || 'inactive',
        hasSubscription: !!org?.stripe_verification_subscription_id,
        priceId: org?.stripe_verification_price_id,
      },
      usage: {
        currentPeriod: usageStats.currentPeriodUsage,
        total: usageStats.totalUsage,
        billingPeriodStart: billingPeriodStartStr,
        billingPeriodEnd: billingPeriodEndStr,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/billing/verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create or activate verification billing subscription
export async function POST() {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only organization owners can manage billing
    if (!['admin', 'organization_owner'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Create subscription
    const result = await createVerificationSubscription(profile.organization_id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create subscription' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      subscriptionId: result.subscriptionId,
      message: 'Verification billing activated',
    });
  } catch (error) {
    console.error('Error in POST /api/billing/verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel verification billing subscription
export async function DELETE() {
  try {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only organization owners can manage billing
    if (!['admin', 'organization_owner'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Cancel subscription
    const result = await cancelVerificationSubscription(profile.organization_id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to cancel subscription' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification billing canceled',
    });
  } catch (error) {
    console.error('Error in DELETE /api/billing/verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
