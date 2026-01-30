/**
 * Marketing Service
 * 
 * Handles marketing operations including:
 * - Promotion campaigns
 * - Advanced coupon rules
 * - Product bundles
 * - Referral programs
 * - Cart abandonment recovery
 */

import { supabase } from '~/lib/supabase.client';
import { handleServiceError } from '~/utils/error-handler';

// =====================================================
// TYPES
// =====================================================

export interface PromotionCampaign {
  id: string;
  name: string;
  description?: string;
  campaign_type: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  max_uses?: number;
  current_uses: number;
  budget?: number;
  spent: number;
}

export interface ProductBundle {
  id: string;
  name: string;
  description?: string;
  bundle_type: string;
  discount_type?: string;
  discount_value?: number;
  bundle_price?: number;
  is_active: boolean;
}

export interface ReferralProgram {
  id: string;
  name: string;
  referrer_reward_type: string;
  referrer_reward_value: number;
  referee_reward_type: string;
  referee_reward_value: number;
  is_active: boolean;
}

export interface CartAbandonmentSnapshot {
  id: string;
  cart_id: string;
  user_id?: string;
  cart_value: number;
  item_count: number;
  abandoned_at: string;
  recovered: boolean;
}

// =====================================================
// PROMOTION CAMPAIGNS
// =====================================================

export async function getActiveCampaigns(): Promise<PromotionCampaign[]> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('promotion_campaigns')
      .select('*')
      .eq('is_active', true)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getActiveCampaigns');
  }
}

export async function createCampaign(params: {
  name: string;
  description?: string;
  campaignType: string;
  startsAt: string;
  endsAt: string;
  maxUses?: number;
  budget?: number;
  createdBy: string;
}): Promise<PromotionCampaign> {
  try {
    const { data, error } = await supabase
      .from('promotion_campaigns')
      .insert({
        name: params.name,
        description: params.description,
        campaign_type: params.campaignType,
        starts_at: params.startsAt,
        ends_at: params.endsAt,
        max_uses: params.maxUses,
        budget: params.budget,
        created_by: params.createdBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleServiceError(error, 'createCampaign');
  }
}

// =====================================================
// ADVANCED COUPONS
// =====================================================

export async function validateCouponWithConditions(
  code: string,
  cartValue: number,
  userId?: string
): Promise<{
  valid: boolean;
  coupon?: any;
  reason?: string;
}> {
  try {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return { valid: false, reason: 'Invalid or inactive coupon' };
    }

    // Check expiration
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return { valid: false, reason: 'Coupon not yet valid' };
    }
    if (coupon.valid_to && new Date(coupon.valid_to) < now) {
      return { valid: false, reason: 'Coupon has expired' };
    }

    // Check usage limits
    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      return { valid: false, reason: 'Coupon usage limit reached' };
    }

    // Check conditions
    if (coupon.conditions) {
      const conditions = coupon.conditions;

      // Minimum cart value
      if (conditions.min_cart_value && cartValue < conditions.min_cart_value) {
        return {
          valid: false,
          reason: `Minimum cart value of ${conditions.min_cart_value} required`,
        };
      }

      // Customer segment check (if applicable)
      if (conditions.customer_segment && userId) {
        const { data: membership } = await supabase
          .from('customer_segment_members')
          .select('id')
          .eq('user_id', userId)
          .eq('segment_id', conditions.customer_segment)
          .eq('is_active', true)
          .single();

        if (!membership) {
          return { valid: false, reason: 'Not eligible for this coupon' };
        }
      }
    }

    return { valid: true, coupon };
  } catch (error) {
    throw handleServiceError(error, 'validateCouponWithConditions');
  }
}

// =====================================================
// PRODUCT BUNDLES
// =====================================================

export async function getActiveBundles(): Promise<ProductBundle[]> {
  try {
    const { data, error } = await supabase
      .from('product_bundles')
      .select(`
        *,
        items:bundle_items(
          *,
          product:products(id, name, price)
        )
      `)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getActiveBundles');
  }
}

export async function createBundle(params: {
  name: string;
  description?: string;
  bundleType: string;
  discountType?: string;
  discountValue?: number;
  bundlePrice?: number;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    isRequired?: boolean;
  }>;
  createdBy: string;
}): Promise<ProductBundle> {
  try {
    // Create bundle
    const { data: bundle, error: bundleError } = await supabase
      .from('product_bundles')
      .insert({
        name: params.name,
        description: params.description,
        bundle_type: params.bundleType,
        discount_type: params.discountType,
        discount_value: params.discountValue,
        bundle_price: params.bundlePrice,
        created_by: params.createdBy,
      })
      .select()
      .single();

    if (bundleError) throw bundleError;

    // Add items
    const bundleItems = params.items.map((item, index) => ({
      bundle_id: bundle.id,
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
      is_required: item.isRequired ?? true,
      display_order: index,
    }));

    const { error: itemsError } = await supabase
      .from('bundle_items')
      .insert(bundleItems);

    if (itemsError) throw itemsError;

    return bundle;
  } catch (error) {
    throw handleServiceError(error, 'createBundle');
  }
}

// =====================================================
// REFERRAL PROGRAM
// =====================================================

export async function createReferralCode(
  userId: string,
  programId: string
): Promise<string> {
  try {
    // Generate unique code
    const code = `REF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error } = await supabase
      .from('referrals')
      .insert({
        program_id: programId,
        referrer_user_id: userId,
        referral_code: code,
        status: 'pending',
      });

    if (error) throw error;
    return code;
  } catch (error) {
    throw handleServiceError(error, 'createReferralCode');
  }
}

export async function trackReferralSignup(
  referralCode: string,
  refereeUserId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('referrals')
      .update({
        referee_user_id: refereeUserId,
        status: 'signed_up',
      })
      .eq('referral_code', referralCode);

    if (error) throw error;
  } catch (error) {
    throw handleServiceError(error, 'trackReferralSignup');
  }
}

export async function trackReferralConversion(
  refereeUserId: string,
  orderId: string
): Promise<void> {
  try {
    // Find referral
    const { data: referral, error: findError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referee_user_id', refereeUserId)
      .eq('status', 'signed_up')
      .single();

    if (findError || !referral) return;

    // Mark as completed
    const { error } = await supabase
      .from('referrals')
      .update({
        first_purchase_order_id: orderId,
        status: 'completed',
      })
      .eq('id', referral.id);

    if (error) throw error;

    // TODO: Award rewards to both referrer and referee
  } catch (error) {
    throw handleServiceError(error, 'trackReferralConversion');
  }
}

// =====================================================
// CART ABANDONMENT
// =====================================================

export async function trackAbandonedCart(
  cartId: string,
  userId?: string
): Promise<CartAbandonmentSnapshot> {
  try {
    // Get cart details
    const { data: cart, error: cartError } = await supabase
      .from('carts')
      .select(`
        *,
        items:cart_items(
          quantity,
          unit_price
        )
      `)
      .eq('id', cartId)
      .single();

    if (cartError) throw cartError;

    const cartValue = cart.items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unit_price,
      0
    );
    const itemCount = cart.items.reduce(
      (sum: number, item: any) => sum + item.quantity,
      0
    );

    // Create snapshot
    const { data, error } = await supabase
      .from('cart_abandonment_snapshots')
      .insert({
        cart_id: cartId,
        user_id: userId,
        cart_value: cartValue,
        item_count: itemCount,
        cart_snapshot: cart,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleServiceError(error, 'trackAbandonedCart');
  }
}

export async function getAbandonedCarts(params?: {
  minValue?: number;
  limit?: number;
  unrecoveredOnly?: boolean;
}): Promise<CartAbandonmentSnapshot[]> {
  try {
    let query = supabase
      .from('cart_abandonment_snapshots')
      .select('*')
      .order('abandoned_at', { ascending: false });

    if (params?.minValue) {
      query = query.gte('cart_value', params.minValue);
    }

    if (params?.unrecoveredOnly) {
      query = query.eq('recovered', false);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getAbandonedCarts');
  }
}

export async function markCartRecovered(
  abandonmentId: string,
  recoveryOrderId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('cart_abandonment_snapshots')
      .update({
        recovered: true,
        recovered_at: new Date().toISOString(),
        recovery_order_id: recoveryOrderId,
      })
      .eq('id', abandonmentId);

    if (error) throw error;
  } catch (error) {
    throw handleServiceError(error, 'markCartRecovered');
  }
}
