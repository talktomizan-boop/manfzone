-- =====================================================
-- MIGRATION 006: ROW LEVEL SECURITY - EXTENSIONS
-- =====================================================
-- Purpose: RLS policies for new tables from migrations 004 and 005
-- Author: System
-- Date: 2024

-- =====================================================
-- ENABLE RLS ON ALL NEW TABLES
-- =====================================================

ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY; -- Table not created yet
ALTER TABLE role_elevations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_ip_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_reauth_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_lifecycle_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attribute_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cod_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_gift_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_abandonment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_performance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sandbox_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_action_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTION: Check if user is admin
-- =====================================================

-- Simplified is_admin function (no roles table yet)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND is_active = TRUE
      AND deleted_at IS NULL
  );
END;
$$;


-- =====================================================
-- ADMIN-ONLY POLICIES (NO PUBLIC ACCESS)
-- =====================================================

-- Admin permissions
CREATE POLICY "Admin can view permissions" ON admin_permissions FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage permissions" ON admin_permissions FOR ALL USING (is_admin());

-- Role permissions (commented out - table not created yet)
-- CREATE POLICY "Admin can view role permissions" ON role_permissions FOR SELECT USING (is_admin());
-- CREATE POLICY "Admin can manage role permissions" ON role_permissions FOR ALL USING (is_admin());

-- Role elevations
CREATE POLICY "Admin can view elevations" ON role_elevations FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage elevations" ON role_elevations FOR ALL USING (is_admin());

-- Admin sessions
CREATE POLICY "Admin can view own sessions" ON admin_sessions FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Admin can create sessions" ON admin_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can update own sessions" ON admin_sessions FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- Admin IP rules
CREATE POLICY "Admin can view IP rules" ON admin_ip_rules FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage IP rules" ON admin_ip_rules FOR ALL USING (is_admin());

-- Admin reauth logs
CREATE POLICY "Admin can view own reauth logs" ON admin_reauth_logs FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "System can insert reauth logs" ON admin_reauth_logs FOR INSERT WITH CHECK (true);

-- Product lifecycle
CREATE POLICY "Anyone can view lifecycle states" ON product_lifecycle_states FOR SELECT USING (true);
CREATE POLICY "Admin can manage lifecycle states" ON product_lifecycle_states FOR ALL USING (is_admin());

-- Product workflow history
CREATE POLICY "Admin can view workflow history" ON product_workflow_history FOR SELECT USING (is_admin());
CREATE POLICY "System can insert workflow history" ON product_workflow_history FOR INSERT WITH CHECK (true);

-- Product approvals
CREATE POLICY "Admin can view approvals" ON product_approvals FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage approvals" ON product_approvals FOR ALL USING (is_admin());

-- Product attribute templates
CREATE POLICY "Anyone can view templates" ON product_attribute_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage templates" ON product_attribute_templates FOR ALL USING (is_admin());

-- Product recommendations
CREATE POLICY "Anyone can view active recommendations" ON product_recommendations FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage recommendations" ON product_recommendations FOR ALL USING (is_admin());

-- Product price history
CREATE POLICY "Admin can view price history" ON product_price_history FOR SELECT USING (is_admin());
CREATE POLICY "System can insert price history" ON product_price_history FOR INSERT WITH CHECK (true);

-- Warehouses
CREATE POLICY "Anyone can view active warehouses" ON warehouses FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage warehouses" ON warehouses FOR ALL USING (is_admin());

-- Warehouse inventory
CREATE POLICY "Anyone can view inventory availability" ON warehouse_inventory FOR SELECT USING (true);
CREATE POLICY "Admin can manage warehouse inventory" ON warehouse_inventory FOR ALL USING (is_admin());

-- Stock reservations
CREATE POLICY "Users can view own reservations" ON stock_reservations FOR SELECT USING (
  reserved_by_cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid()) OR is_admin()
);
CREATE POLICY "System can create reservations" ON stock_reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update reservations" ON stock_reservations FOR UPDATE USING (true);

-- Inventory movements
CREATE POLICY "Admin can view inventory movements" ON inventory_movements FOR SELECT USING (is_admin());
CREATE POLICY "System can insert inventory movements" ON inventory_movements FOR INSERT WITH CHECK (true);

-- Suppliers
CREATE POLICY "Admin can view suppliers" ON suppliers FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage suppliers" ON suppliers FOR ALL USING (is_admin());

-- Product suppliers
CREATE POLICY "Admin can view product suppliers" ON product_suppliers FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage product suppliers" ON product_suppliers FOR ALL USING (is_admin());

-- Order states
CREATE POLICY "Anyone can view order states" ON order_states FOR SELECT USING (true);
CREATE POLICY "Admin can manage order states" ON order_states FOR ALL USING (is_admin());

-- Order state transitions
CREATE POLICY "Anyone can view transitions" ON order_state_transitions FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage transitions" ON order_state_transitions FOR ALL USING (is_admin());

-- Order state history
CREATE POLICY "Users can view own order history" ON order_state_history FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()) OR is_admin()
);
CREATE POLICY "System can insert order state history" ON order_state_history FOR INSERT WITH CHECK (true);

-- Order splits
CREATE POLICY "Admin can view order splits" ON order_splits FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage order splits" ON order_splits FOR ALL USING (is_admin());

-- Shipments
CREATE POLICY "Users can view own shipments" ON shipments FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()) OR is_admin()
);
CREATE POLICY "Admin can manage shipments" ON shipments FOR ALL USING (is_admin());

-- Shipment items
CREATE POLICY "Users can view own shipment items" ON shipment_items FOR SELECT USING (
  shipment_id IN (SELECT s.id FROM shipments s JOIN orders o ON s.order_id = o.id WHERE o.user_id = auth.uid())
  OR is_admin()
);
CREATE POLICY "Admin can manage shipment items" ON shipment_items FOR ALL USING (is_admin());

-- Payment reconciliations
CREATE POLICY "Admin can view reconciliations" ON payment_reconciliations FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage reconciliations" ON payment_reconciliations FOR ALL USING (is_admin());

-- COD settlements
CREATE POLICY "Admin can view COD settlements" ON cod_settlements FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage COD settlements" ON cod_settlements FOR ALL USING (is_admin());

-- Refund approvals
CREATE POLICY "Users can view own refund requests" ON refund_approvals FOR SELECT USING (
  requested_by = auth.uid() OR is_admin()
);
CREATE POLICY "Users can request refunds" ON refund_approvals FOR INSERT WITH CHECK (requested_by = auth.uid());
CREATE POLICY "Admin can manage refund approvals" ON refund_approvals FOR UPDATE USING (is_admin());

-- Customer wallets
CREATE POLICY "Users can view own wallet" ON customer_wallets FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "System can manage wallets" ON customer_wallets FOR ALL USING (is_admin());

-- Wallet transactions
CREATE POLICY "Users can view own transactions" ON wallet_transactions FOR SELECT USING (
  wallet_id IN (SELECT id FROM customer_wallets WHERE user_id = auth.uid()) OR is_admin()
);
CREATE POLICY "System can insert transactions" ON wallet_transactions FOR INSERT WITH CHECK (true);

-- Tax rules
CREATE POLICY "Anyone can view active tax rules" ON tax_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage tax rules" ON tax_rules FOR ALL USING (is_admin());

-- Customer segments
CREATE POLICY "Admin can view segments" ON customer_segments FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage segments" ON customer_segments FOR ALL USING (is_admin());

-- Customer segment members
CREATE POLICY "Users can view own segments" ON customer_segment_members FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "System can manage segment membership" ON customer_segment_members FOR ALL USING (is_admin());

-- Customer tags
CREATE POLICY "Admin can view tags" ON customer_tags FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage tags" ON customer_tags FOR ALL USING (is_admin());

-- User customer tags
CREATE POLICY "Users can view own tags" ON user_customer_tags FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Admin can manage user tags" ON user_customer_tags FOR ALL USING (is_admin());

-- Customer notes
CREATE POLICY "Admin can view customer notes" ON customer_notes FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage customer notes" ON customer_notes FOR ALL USING (is_admin());

-- Customer timeline events
CREATE POLICY "Users can view own timeline" ON customer_timeline_events FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "System can insert timeline events" ON customer_timeline_events FOR INSERT WITH CHECK (true);

-- Customer risk flags
CREATE POLICY "Admin can view risk flags" ON customer_risk_flags FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage risk flags" ON customer_risk_flags FOR ALL USING (is_admin());

-- Customer access control
CREATE POLICY "Admin can view access control" ON customer_access_control FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage access control" ON customer_access_control FOR ALL USING (is_admin());

-- Loyalty tiers
CREATE POLICY "Anyone can view active tiers" ON loyalty_tiers FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage tiers" ON loyalty_tiers FOR ALL USING (is_admin());

-- Customer loyalty points
CREATE POLICY "Users can view own points" ON customer_loyalty_points FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "System can manage loyalty points" ON customer_loyalty_points FOR ALL USING (is_admin());

-- Points transactions
CREATE POLICY "Users can view own points transactions" ON points_transactions FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "System can insert points transactions" ON points_transactions FOR INSERT WITH CHECK (true);

-- Promotion campaigns
CREATE POLICY "Anyone can view active campaigns" ON promotion_campaigns FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage campaigns" ON promotion_campaigns FOR ALL USING (is_admin());

-- Product bundles
CREATE POLICY "Anyone can view active bundles" ON product_bundles FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage bundles" ON product_bundles FOR ALL USING (is_admin());

-- Bundle items
CREATE POLICY "Anyone can view bundle items" ON bundle_items FOR SELECT USING (
  bundle_id IN (SELECT id FROM product_bundles WHERE is_active = true)
);
CREATE POLICY "Admin can manage bundle items" ON bundle_items FOR ALL USING (is_admin());

-- Free gift rules
CREATE POLICY "Anyone can view active gift rules" ON free_gift_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage gift rules" ON free_gift_rules FOR ALL USING (is_admin());

-- Referral programs
CREATE POLICY "Anyone can view active programs" ON referral_programs FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage programs" ON referral_programs FOR ALL USING (is_admin());

-- Referrals
CREATE POLICY "Users can view own referrals" ON referrals FOR SELECT USING (
  referrer_user_id = auth.uid() OR referee_user_id = auth.uid() OR is_admin()
);
CREATE POLICY "Users can create referrals" ON referrals FOR INSERT WITH CHECK (referrer_user_id = auth.uid());
CREATE POLICY "System can update referrals" ON referrals FOR UPDATE USING (true);

-- CMS pages
CREATE POLICY "Anyone can view published pages" ON cms_pages FOR SELECT USING (status = 'published');
CREATE POLICY "Admin can manage pages" ON cms_pages FOR ALL USING (is_admin());

-- CMS page versions
CREATE POLICY "Admin can view page versions" ON cms_page_versions FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage page versions" ON cms_page_versions FOR ALL USING (is_admin());

-- Automation rules
CREATE POLICY "Admin can view automation rules" ON automation_rules FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage automation rules" ON automation_rules FOR ALL USING (is_admin());

-- Automation executions
CREATE POLICY "Admin can view executions" ON automation_executions FOR SELECT USING (is_admin());
CREATE POLICY "System can insert executions" ON automation_executions FOR INSERT WITH CHECK (true);

-- Scheduled tasks
CREATE POLICY "Admin can view tasks" ON scheduled_tasks FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage tasks" ON scheduled_tasks FOR ALL USING (is_admin());

-- Background jobs
CREATE POLICY "Admin can view jobs" ON background_jobs FOR SELECT USING (is_admin());
CREATE POLICY "System can manage jobs" ON background_jobs FOR ALL USING (true);

-- Funnel events
CREATE POLICY "System can insert funnel events" ON funnel_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can view funnel events" ON funnel_events FOR SELECT USING (is_admin());

-- Cart abandonment
CREATE POLICY "Admin can view abandonment data" ON cart_abandonment_snapshots FOR SELECT USING (is_admin());
CREATE POLICY "System can manage abandonment data" ON cart_abandonment_snapshots FOR ALL USING (true);

-- Product performance stats
CREATE POLICY "Admin can view product stats" ON product_performance_stats FOR SELECT USING (is_admin());
CREATE POLICY "System can manage product stats" ON product_performance_stats FOR ALL USING (true);

-- Sales metrics
CREATE POLICY "Admin can view sales metrics" ON sales_metrics FOR SELECT USING (is_admin());
CREATE POLICY "System can manage sales metrics" ON sales_metrics FOR ALL USING (true);

-- Admin insights
CREATE POLICY "Admin can view insights" ON admin_insights FOR SELECT USING (is_admin());
CREATE POLICY "Admin can dismiss insights" ON admin_insights FOR UPDATE USING (is_admin());
CREATE POLICY "System can create insights" ON admin_insights FOR INSERT WITH CHECK (true);

-- Admin notifications
CREATE POLICY "Admin can view own notifications" ON admin_notifications FOR SELECT USING (recipient_user_id = auth.uid());
CREATE POLICY "Admin can update own notifications" ON admin_notifications FOR UPDATE USING (recipient_user_id = auth.uid());
CREATE POLICY "System can create notifications" ON admin_notifications FOR INSERT WITH CHECK (true);

-- System activity log
CREATE POLICY "Admin can view activity log" ON system_activity_log FOR SELECT USING (is_admin());
CREATE POLICY "System can insert activity log" ON system_activity_log FOR INSERT WITH CHECK (true);

-- A/B test experiments
CREATE POLICY "Admin can view experiments" ON ab_test_experiments FOR SELECT USING (is_admin());
CREATE POLICY "Admin can manage experiments" ON ab_test_experiments FOR ALL USING (is_admin());

-- A/B test assignments
CREATE POLICY "Users can view own assignments" ON ab_test_assignments FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "System can manage assignments" ON ab_test_assignments FOR ALL USING (true);

-- Admin sandbox sessions
CREATE POLICY "Admin can view own sandbox sessions" ON admin_sandbox_sessions FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Admin can create sandbox sessions" ON admin_sandbox_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can update own sessions" ON admin_sandbox_sessions FOR UPDATE USING (user_id = auth.uid());

-- Sandbox actions
CREATE POLICY "Admin can view sandbox actions" ON sandbox_actions FOR SELECT USING (
  sandbox_session_id IN (SELECT id FROM admin_sandbox_sessions WHERE user_id = auth.uid()) OR is_admin()
);
CREATE POLICY "Admin can create sandbox actions" ON sandbox_actions FOR INSERT WITH CHECK (true);

-- Admin action confirmations
CREATE POLICY "Admin can view own confirmations" ON admin_action_confirmations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin can create confirmations" ON admin_action_confirmations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can update own confirmations" ON admin_action_confirmations FOR UPDATE USING (user_id = auth.uid());

-- Data deletion requests
CREATE POLICY "Users can view own deletion requests" ON data_deletion_requests FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Users can create deletion requests" ON data_deletion_requests FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admin can process deletion requests" ON data_deletion_requests FOR UPDATE USING (is_admin());

-- Legal document versions
CREATE POLICY "Anyone can view current legal docs" ON legal_document_versions FOR SELECT USING (is_current = true);
CREATE POLICY "Admin can manage legal docs" ON legal_document_versions FOR ALL USING (is_admin());

-- User consents
CREATE POLICY "Users can view own consents" ON user_consents FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Users can create consents" ON user_consents FOR INSERT WITH CHECK (user_id = auth.uid());
