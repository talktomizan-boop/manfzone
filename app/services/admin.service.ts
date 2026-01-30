/**
 * Admin Service
 * 
 * Handles advanced admin operations including:
 * - Permission management
 * - Role elevation
 * - Session tracking
 * - Insights and recommendations
 * - Sandbox mode
 */

import { supabase } from '~/lib/supabase.client';
import { handleServiceError } from '~/utils/error-handler';

// =====================================================
// TYPES
// =====================================================

export interface AdminPermission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface RoleElevation {
  id: string;
  user_id: string;
  elevated_role_id: string;
  original_role_id: string;
  reason: string;
  expires_at: string;
  elevated_by: string;
  is_active: boolean;
}

export interface AdminSession {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent?: string;
  started_at: string;
  last_activity_at: string;
  is_active: boolean;
  risk_score: number;
}

export interface AdminInsight {
  id: string;
  insight_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description?: string;
  suggested_actions: Array<Record<string, any>>;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
  is_active: boolean;
}

export interface AdminNotification {
  id: string;
  recipient_user_id: string;
  notification_type: string;
  title: string;
  message?: string;
  action_url?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  created_at: string;
}

export interface SystemActivityLog {
  id: string;
  activity_type: string;
  entity_type: string;
  entity_id?: string;
  actor_user_id?: string;
  activity_summary: string;
  occurred_at: string;
}

export interface SandboxSession {
  id: string;
  user_id: string;
  session_name?: string;
  started_at: string;
  is_active: boolean;
  actions_performed: number;
}

// =====================================================
// PERMISSION MANAGEMENT
// =====================================================

export async function getUserPermissions(userId: string): Promise<AdminPermission[]> {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select(`
        permission:admin_permissions (
          id,
          name,
          resource,
          action,
          description
        )
      `)
      .eq('role_id', userId);

    if (error) throw error;
    return (data || []).map((item: any) => item.permission).filter(Boolean);
  } catch (error) {
    throw handleServiceError(error, 'getUserPermissions');
  }
}

export async function checkPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_user_permission', {
      p_user_id: userId,
      p_resource: resource,
      p_action: action,
    });

    if (error) throw error;
    return data === true;
  } catch (error) {
    // If RPC doesn't exist, fallback to manual check
    try {
      const permissions = await getUserPermissions(userId);
      return permissions.some(
        (p) => p.resource === resource && p.action === action
      );
    } catch (fallbackError) {
      throw handleServiceError(error, 'checkPermission');
    }
  }
}

// =====================================================
// ROLE ELEVATION
// =====================================================

export async function elevateUserRole(params: {
  userId: string;
  elevatedRoleId: string;
  originalRoleId: string;
  reason: string;
  expiresAt: string;
  elevatedBy: string;
}): Promise<RoleElevation> {
  try {
    const { data, error } = await supabase
      .from('role_elevations')
      .insert({
        user_id: params.userId,
        elevated_role_id: params.elevatedRoleId,
        original_role_id: params.originalRoleId,
        reason: params.reason,
        expires_at: params.expiresAt,
        elevated_by: params.elevatedBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleServiceError(error, 'elevateUserRole');
  }
}

export async function revokeRoleElevation(
  elevationId: string,
  revokedBy: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('role_elevations')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
      })
      .eq('id', elevationId);

    if (error) throw error;
  } catch (error) {
    throw handleServiceError(error, 'revokeRoleElevation');
  }
}

export async function getActiveElevations(userId: string): Promise<RoleElevation[]> {
  try {
    const { data, error } = await supabase
      .from('role_elevations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getActiveElevations');
  }
}

// =====================================================
// SESSION TRACKING
// =====================================================

export async function trackAdminSession(params: {
  userId: string;
  ipAddress: string;
  userAgent?: string;
  deviceFingerprint?: string;
}): Promise<AdminSession> {
  try {
    const { data, error } = await supabase
      .from('admin_sessions')
      .insert({
        user_id: params.userId,
        session_token: crypto.randomUUID(),
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        device_fingerprint: params.deviceFingerprint,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleServiceError(error, 'trackAdminSession');
  }
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('admin_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) throw error;
  } catch (error) {
    throw handleServiceError(error, 'updateSessionActivity');
  }
}

export async function endAdminSession(sessionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('admin_sessions')
      .update({
        ended_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', sessionId);

    if (error) throw error;
  } catch (error) {
    throw handleServiceError(error, 'endAdminSession');
  }
}

export async function getActiveSessions(userId: string): Promise<AdminSession[]> {
  try {
    const { data, error } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_activity_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getActiveSessions');
  }
}

// =====================================================
// ADMIN INSIGHTS & RECOMMENDATIONS
// =====================================================

export async function getActiveInsights(params?: {
  severity?: string;
  limit?: number;
}): Promise<AdminInsight[]> {
  try {
    let query = supabase
      .from('admin_insights')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (params?.severity) {
      query = query.eq('severity', params.severity);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getActiveInsights');
  }
}

export async function createInsight(params: {
  insightType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description?: string;
  suggestedActions?: Array<Record<string, any>>;
  referenceType?: string;
  referenceId?: string;
}): Promise<AdminInsight> {
  try {
    const { data, error } = await supabase
      .from('admin_insights')
      .insert({
        insight_type: params.insightType,
        severity: params.severity,
        title: params.title,
        description: params.description,
        suggested_actions: params.suggestedActions || [],
        reference_type: params.referenceType,
        reference_id: params.referenceId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleServiceError(error, 'createInsight');
  }
}

export async function dismissInsight(
  insightId: string,
  dismissedBy: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('admin_insights')
      .update({
        dismissed_at: new Date().toISOString(),
        dismissed_by: dismissedBy,
        is_active: false,
      })
      .eq('id', insightId);

    if (error) throw error;
  } catch (error) {
    throw handleServiceError(error, 'dismissInsight');
  }
}

// =====================================================
// ADMIN NOTIFICATIONS
// =====================================================

export async function getAdminNotifications(
  userId: string,
  unreadOnly = false
): Promise<AdminNotification[]> {
  try {
    let query = supabase
      .from('admin_notifications')
      .select('*')
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getAdminNotifications');
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('admin_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    throw handleServiceError(error, 'markNotificationAsRead');
  }
}

export async function createAdminNotification(params: {
  recipientUserId: string;
  notificationType: string;
  title: string;
  message?: string;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}): Promise<AdminNotification> {
  try {
    const { data, error } = await supabase
      .from('admin_notifications')
      .insert({
        recipient_user_id: params.recipientUserId,
        notification_type: params.notificationType,
        title: params.title,
        message: params.message,
        action_url: params.actionUrl,
        priority: params.priority || 'normal',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleServiceError(error, 'createAdminNotification');
  }
}

// =====================================================
// SYSTEM ACTIVITY LOG
// =====================================================

export async function logSystemActivity(params: {
  activityType: string;
  entityType: string;
  entityId?: string;
  actorUserId?: string;
  activitySummary: string;
  changesSnapshot?: Record<string, any>;
  ipAddress?: string;
}): Promise<SystemActivityLog> {
  try {
    const { data, error } = await supabase
      .from('system_activity_log')
      .insert({
        activity_type: params.activityType,
        entity_type: params.entityType,
        entity_id: params.entityId,
        actor_user_id: params.actorUserId,
        activity_summary: params.activitySummary,
        changes_snapshot: params.changesSnapshot,
        ip_address: params.ipAddress,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleServiceError(error, 'logSystemActivity');
  }
}

export async function getRecentActivity(params?: {
  limit?: number;
  activityType?: string;
  entityType?: string;
}): Promise<SystemActivityLog[]> {
  try {
    let query = supabase
      .from('system_activity_log')
      .select('*')
      .order('occurred_at', { ascending: false });

    if (params?.activityType) {
      query = query.eq('activity_type', params.activityType);
    }

    if (params?.entityType) {
      query = query.eq('entity_type', params.entityType);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw handleServiceError(error, 'getRecentActivity');
  }
}

// =====================================================
// SANDBOX MODE
// =====================================================

export async function createSandboxSession(params: {
  userId: string;
  sessionName?: string;
}): Promise<SandboxSession> {
  try {
    const { data, error } = await supabase
      .from('admin_sandbox_sessions')
      .insert({
        user_id: params.userId,
        session_name: params.sessionName,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw handleServiceError(error, 'createSandboxSession');
  }
}

export async function endSandboxSession(sessionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('admin_sandbox_sessions')
      .update({
        ended_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', sessionId);

    if (error) throw error;
  } catch (error) {
    throw handleServiceError(error, 'endSandboxSession');
  }
}

export async function logSandboxAction(params: {
  sandboxSessionId: string;
  actionType: string;
  actionData: Record<string, any>;
  previewResult?: Record<string, any>;
  impactSummary?: string;
}): Promise<void> {
  try {
    const { error } = await supabase
      .from('sandbox_actions')
      .insert({
        sandbox_session_id: params.sandboxSessionId,
        action_type: params.actionType,
        action_data: params.actionData,
        preview_result: params.previewResult,
        impact_summary: params.impactSummary,
      });

    if (error) throw error;
  } catch (error) {
    throw handleServiceError(error, 'logSandboxAction');
  }
}

// =====================================================
// DASHBOARD METRICS (WHAT CHANGED TODAY)
// =====================================================

export async function getTodayChanges(): Promise<{
  newOrders: number;
  newCustomers: number;
  newProducts: number;
  revenue: number;
  recentActivity: SystemActivityLog[];
}> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Get activity from today
    const { data: activity, error: activityError } = await supabase
      .from('system_activity_log')
      .select('*')
      .gte('occurred_at', todayISO)
      .order('occurred_at', { ascending: false })
      .limit(10);

    if (activityError) throw activityError;

    // Get sales metrics for today
    const { data: salesMetrics, error: salesError } = await supabase
      .from('sales_metrics')
      .select('*')
      .eq('metric_date', today.toISOString().split('T')[0])
      .single();

    return {
      newOrders: salesMetrics?.total_orders || 0,
      newCustomers: salesMetrics?.new_customers || 0,
      newProducts: 0, // Calculate from activity log
      revenue: salesMetrics?.total_revenue || 0,
      recentActivity: activity || [],
    };
  } catch (error) {
    throw handleServiceError(error, 'getTodayChanges');
  }
}
