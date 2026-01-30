/**
 * Analytics Service
 * 
 * Handles business intelligence and analytics including:
 * - Conversion funnel tracking
 * - Product performance metrics
 * - Sales analytics
 * - Customer behavior analysis
 * - A/B testing
 */

import { supabase } from '~/lib/supabase.client';
import { handleServiceError } from '~/utils/error-handler';

// =====================================================
// TYPES
// =====================================================

export interface FunnelEvent {
  id: string;
  session_id: string;
  user_id?: string;
  event_type: string;
  event_data: Record<string, any>;
  occurred_at: string;
}

export interface ProductPerformanceStats {
  id: string;
  product_id: string;
  period_start: string;
  period_end: string;
  views_count: number;
  cart_additions_count: number;
  purchases_count: number;
  revenue: number;
  conversion_rate: number;
}

export interface SalesMetrics {
  metric_date: string;
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  total_refunds: number;
  net_revenue: number;
  average_order_value: number;
  new_customers: number;
  returning_customers: number;
  cart_abandonment_rate: number;
}

export interface ABTestExperiment {
  id: string;
  name: string;
  description?: string;
  variants: Array<{ name: string; weight: number }>;
  success_metric: string;
  status: string;
}

// =====================================================
// FUNNEL TRACKING
// =====================================================

export async function trackFunnelEvent(params: {
  sessionId: string;
  userId?: string;
  eventType: string;
  eventData?: Record<string, any>;
  pageUrl?: string;
  referrer?: string;
}): Promise<FunnelEvent> {
  try {
    const { data, error } = await supabase
      .from('funnel_events')
      .insert({
        session_id: params.sessionId,
        user_id: params.userId,
        event_type: params.eventType,
        event_data: params.eventData || {},
        page_url: params.pageUrl,
        referrer: params.referrer,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleServiceError(error, 'trackFunnelEvent');
  }
}

export async function getConversionFunnel(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<{
  page_views: number;
  product_views: number;
  add_to_cart: number;
  checkout_start: number;
  checkout_complete: number;
  conversion_rate: number;
}> {
  try {
    let query = supabase.from('funnel_events').select('event_type');

    if (params?.startDate) {
      query = query.gte('occurred_at', params.startDate);
    }
    if (params?.endDate) {
      query = query.lte('occurred_at', params.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Count events by type
    const counts = {
      page_views: 0,
      product_views: 0,
      add_to_cart: 0,
      checkout_start: 0,
      checkout_complete: 0,
    };

    (data || []).forEach((event: any) => {
      if (event.event_type === 'page_view') counts.page_views++;
      else if (event.event_type === 'product_view') counts.product_views++;
      else if (event.event_type === 'add_to_cart') counts.add_to_cart++;
      else if (event.event_type === 'checkout_start') counts.checkout_start++;
      else if (event.event_type === 'checkout_complete') counts.checkout_complete++;
    });

    const conversion_rate =
      counts.page_views > 0
        ? (counts.checkout_complete / counts.page_views) * 100
        : 0;

    return { ...counts, conversion_rate };
  } catch (error) {
    throw handleServiceError(error, 'getConversionFunnel');
  }
}

// =====================================================
// PRODUCT PERFORMANCE
// =====================================================

export async function getProductPerformance(
  productId: string,
  startDate: string,
  endDate: string
): Promise<ProductPerformanceStats | null> {
  try {
    const { data, error } = await supabase
      .from('product_performance_stats')
      .select('*')
      .eq('product_id', productId)
      .gte('period_start', startDate)
      .lte('period_end', endDate)
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    throw handleServiceError(error, 'getProductPerformance');
  }
}

export async function getTopPerformingProducts(params?: {
  limit?: number;
  sortBy?: 'revenue' | 'purchases' | 'conversion_rate';
  startDate?: string;
  endDate?: string;
}): Promise<ProductPerformanceStats[]> {
  try {
    const sortBy = params?.sortBy || 'revenue';
    let query = supabase
      .from('product_performance_stats')
      .select('*')
      .order(sortBy, { ascending: false });

    if (params?.startDate) {
      query = query.gte('period_start', params.startDate);
    }
    if (params?.endDate) {
      query = query.lte('period_end', params.endDate);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getTopPerformingProducts');
  }
}

// =====================================================
// SALES ANALYTICS
// =====================================================

export async function getSalesMetrics(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<SalesMetrics[]> {
  try {
    let query = supabase
      .from('sales_metrics')
      .select('*')
      .order('metric_date', { ascending: false });

    if (params?.startDate) {
      query = query.gte('metric_date', params.startDate);
    }
    if (params?.endDate) {
      query = query.lte('metric_date', params.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getSalesMetrics');
  }
}

export async function getDailySalesOverview(date: string): Promise<SalesMetrics | null> {
  try {
    const { data, error } = await supabase
      .from('sales_metrics')
      .select('*')
      .eq('metric_date', date)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    throw handleServiceError(error, 'getDailySalesOverview');
  }
}

export async function calculateRevenueByPeriod(params: {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
}): Promise<Array<{ period: string; revenue: number; orders: number }>> {
  try {
    const { data, error } = await supabase
      .from('sales_metrics')
      .select('metric_date, total_revenue, total_orders')
      .gte('metric_date', params.startDate)
      .lte('metric_date', params.endDate)
      .order('metric_date', { ascending: true });

    if (error) throw error;

    // For now, return daily data
    // In production, implement aggregation based on groupBy parameter
    return (data || []).map((item: any) => ({
      period: item.metric_date,
      revenue: item.total_revenue,
      orders: item.total_orders,
    }));
  } catch (error) {
    throw handleServiceError(error, 'calculateRevenueByPeriod');
  }
}

// =====================================================
// CUSTOMER ANALYTICS
// =====================================================

export async function getCustomerLifetimeValue(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (error) throw error;

    return (data || []).reduce(
      (sum: number, order: any) => sum + (order.total_amount || 0),
      0
    );
  } catch (error) {
    throw handleServiceError(error, 'getCustomerLifetimeValue');
  }
}

export async function getCustomerSegmentPerformance(): Promise<
  Array<{
    segment_id: string;
    segment_name: string;
    customer_count: number;
    total_revenue: number;
    average_order_value: number;
  }>
> {
  try {
    // This would require a complex query joining segments, members, and orders
    // For now, return placeholder structure
    const { data: segments, error } = await supabase
      .from('customer_segments')
      .select(`
        id,
        name,
        members:customer_segment_members(count)
      `)
      .eq('is_active', true);

    if (error) throw error;

    return (segments || []).map((segment: any) => ({
      segment_id: segment.id,
      segment_name: segment.name,
      customer_count: segment.members?.[0]?.count || 0,
      total_revenue: 0, // Calculate from orders
      average_order_value: 0, // Calculate from orders
    }));
  } catch (error) {
    throw handleServiceError(error, 'getCustomerSegmentPerformance');
  }
}

// =====================================================
// A/B TESTING
// =====================================================

export async function getActiveExperiments(): Promise<ABTestExperiment[]> {
  try {
    const { data, error } = await supabase
      .from('ab_test_experiments')
      .select('*')
      .eq('status', 'running')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getActiveExperiments');
  }
}

export async function assignUserToExperiment(params: {
  experimentId: string;
  userId?: string;
  sessionId: string;
}): Promise<string> {
  try {
    // Get experiment details
    const { data: experiment, error: expError } = await supabase
      .from('ab_test_experiments')
      .select('variants')
      .eq('id', params.experimentId)
      .single();

    if (expError) throw expError;

    // Randomly assign variant based on weights
    const variants = experiment.variants;
    const totalWeight = variants.reduce(
      (sum: number, v: any) => sum + v.weight,
      0
    );
    let random = Math.random() * totalWeight;
    let selectedVariant = variants[0].name;

    for (const variant of variants) {
      random -= variant.weight;
      if (random <= 0) {
        selectedVariant = variant.name;
        break;
      }
    }

    // Store assignment
    await supabase.from('ab_test_assignments').insert({
      experiment_id: params.experimentId,
      user_id: params.userId,
      session_id: params.sessionId,
      variant_name: selectedVariant,
    });

    return selectedVariant;
  } catch (error) {
    throw handleServiceError(error, 'assignUserToExperiment');
  }
}

export async function getUserExperimentVariant(
  experimentId: string,
  userId?: string,
  sessionId?: string
): Promise<string | null> {
  try {
    let query = supabase
      .from('ab_test_assignments')
      .select('variant_name')
      .eq('experiment_id', experimentId);

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      return null;
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.variant_name || null;
  } catch (error) {
    throw handleServiceError(error, 'getUserExperimentVariant');
  }
}

// =====================================================
// CART ABANDONMENT ANALYTICS
// =====================================================

export async function getCartAbandonmentRate(params?: {
  startDate?: string;
  endDate?: string;
}): Promise<number> {
  try {
    let abandonmentQuery = supabase
      .from('cart_abandonment_snapshots')
      .select('id', { count: 'exact', head: true });

    let recoveredQuery = supabase
      .from('cart_abandonment_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('recovered', true);

    if (params?.startDate) {
      abandonmentQuery = abandonmentQuery.gte('abandoned_at', params.startDate);
      recoveredQuery = recoveredQuery.gte('abandoned_at', params.startDate);
    }
    if (params?.endDate) {
      abandonmentQuery = abandonmentQuery.lte('abandoned_at', params.endDate);
      recoveredQuery = recoveredQuery.lte('abandoned_at', params.endDate);
    }

    const [{ count: totalAbandoned }, { count: recovered }] = await Promise.all([
      abandonmentQuery,
      recoveredQuery,
    ]);

    if (!totalAbandoned) return 0;
    return ((totalAbandoned - (recovered || 0)) / totalAbandoned) * 100;
  } catch (error) {
    throw handleServiceError(error, 'getCartAbandonmentRate');
  }
}
