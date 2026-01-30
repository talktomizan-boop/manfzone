-- =====================================================
-- MIGRATION 005: MARKETING, AUTOMATION & ANALYTICS EXTENSIONS
-- =====================================================
-- Purpose: Advanced promotions, automation rules, analytics, and CMS
-- Author: System
-- Date: 2024

-- =====================================================
-- 1. ADVANCED PROMOTIONS & MARKETING
-- =====================================================

-- Promotion campaigns
CREATE TABLE IF NOT EXISTS promotion_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50) NOT NULL, -- discount, flash_sale, bundle, free_gift, bogo
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  max_uses INTEGER,
  max_uses_per_customer INTEGER,
  current_uses INTEGER DEFAULT 0,
  budget DECIMAL(10,2),
  spent DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'
);

-- Advanced coupon rules with conditions
ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES promotion_campaigns(id),
  ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '{}', -- {"min_cart_value": 1000, "excluded_categories": [], "customer_segment": "vip"}
  ADD COLUMN IF NOT EXISTS max_discount_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS applies_to_shipping BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stackable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_apply BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS target_customer_segment_id UUID; -- REFERENCES customer_segments(id) when created

-- Bundle offers
CREATE TABLE IF NOT EXISTS product_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  bundle_type VARCHAR(50) DEFAULT 'fixed', -- fixed, flexible, mix_and_match
  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed', 'bundle_price')),
  discount_value DECIMAL(10,2),
  bundle_price DECIMAL(10,2),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  max_quantity_per_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'
);

-- Bundle items
CREATE TABLE IF NOT EXISTS bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_required BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0
);

-- Free gift rules
CREATE TABLE IF NOT EXISTS free_gift_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  conditions JSONB NOT NULL, -- {"min_cart_value": 2000, "category_id": "uuid"}
  gift_product_id UUID NOT NULL REFERENCES products(id),
  gift_variant_id UUID REFERENCES product_variants(id),
  max_gifts_per_order INTEGER DEFAULT 1,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Referral program
CREATE TABLE IF NOT EXISTS referral_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  referrer_reward_type VARCHAR(20) CHECK (referrer_reward_type IN ('points', 'credit', 'coupon', 'discount')),
  referrer_reward_value DECIMAL(10,2),
  referee_reward_type VARCHAR(20) CHECK (referee_reward_type IN ('points', 'credit', 'coupon', 'discount')),
  referee_reward_value DECIMAL(10,2),
  minimum_referee_purchase DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Referrals tracking
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES referral_programs(id),
  referrer_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referee_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) NOT NULL UNIQUE,
  referee_email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'completed', 'rewarded')),
  first_purchase_order_id UUID REFERENCES orders(id),
  referrer_rewarded_at TIMESTAMPTZ,
  referee_rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 2. CMS & CONTENT MANAGEMENT
-- =====================================================

-- Static pages (About, Terms, Privacy, etc.)
CREATE TABLE IF NOT EXISTS cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  content TEXT,
  excerpt TEXT,
  page_type VARCHAR(50) DEFAULT 'general', -- general, legal, marketing
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  seo_title VARCHAR(200),
  seo_description TEXT,
  seo_keywords TEXT,
  og_image_url TEXT,
  template VARCHAR(50) DEFAULT 'default',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'
);

-- Page version history
CREATE TABLE IF NOT EXISTS cms_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_summary TEXT,
  content_snapshot JSONB NOT NULL,
  is_published BOOLEAN DEFAULT FALSE
);

-- Homepage banners with scheduling
ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS target_audience_segment_id UUID, -- REFERENCES customer_segments(id) when created
  ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impression_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctr DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN impression_count > 0 THEN (click_count::DECIMAL / impression_count * 100) ELSE 0 END
  ) STORED,
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- =====================================================
-- 3. AUTOMATION & WORKFLOW ENGINE
-- =====================================================

-- Automation rules
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL, -- order_created, payment_failed, cart_abandoned, stock_low, customer_inactive
  trigger_conditions JSONB DEFAULT '{}', -- {"status": "pending", "unpaid_hours": 24}
  action_type VARCHAR(50) NOT NULL, -- send_email, cancel_order, refund, notify_admin, update_status
  action_params JSONB DEFAULT '{}', -- {"email_template": "payment_reminder", "status": "cancelled"}
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'
);

-- Automation execution log
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  triggered_by_entity_type VARCHAR(50), -- order, cart, product
  triggered_by_entity_id UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN NOT NULL,
  error_message TEXT,
  execution_time_ms INTEGER,
  result JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Scheduled tasks
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name VARCHAR(100) NOT NULL,
  task_type VARCHAR(50) NOT NULL, -- cleanup, report_generation, sync, notification
  schedule_cron VARCHAR(100), -- "0 2 * * *" for 2am daily
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20), -- success, failed, skipped
  is_active BOOLEAN DEFAULT TRUE,
  task_params JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Background job queue
CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(50) NOT NULL, -- email, invoice_generation, export, sync
  job_data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 4. ANALYTICS & BUSINESS INTELLIGENCE
-- =====================================================

-- Conversion funnel tracking
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES profiles(id),
  event_type VARCHAR(50) NOT NULL, -- page_view, product_view, add_to_cart, checkout_start, checkout_complete
  event_data JSONB DEFAULT '{}',
  page_url TEXT,
  referrer TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Cart abandonment tracking
CREATE TABLE IF NOT EXISTS cart_abandonment_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  cart_value DECIMAL(10,2) NOT NULL,
  item_count INTEGER NOT NULL,
  cart_snapshot JSONB NOT NULL,
  abandoned_at TIMESTAMPTZ DEFAULT NOW(),
  recovery_email_sent_at TIMESTAMPTZ,
  recovered BOOLEAN DEFAULT FALSE,
  recovered_at TIMESTAMPTZ,
  recovery_order_id UUID REFERENCES orders(id),
  metadata JSONB DEFAULT '{}'
);

-- Product performance metrics (aggregated)
CREATE TABLE IF NOT EXISTS product_performance_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  views_count INTEGER DEFAULT 0,
  cart_additions_count INTEGER DEFAULT 0,
  purchases_count INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0.00,
  returns_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, period_start, period_end)
);

-- Sales metrics summary (daily/weekly/monthly)
CREATE TABLE IF NOT EXISTS sales_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL UNIQUE,
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  cancelled_orders INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0.00,
  total_refunds DECIMAL(12,2) DEFAULT 0.00,
  net_revenue DECIMAL(12,2) DEFAULT 0.00,
  average_order_value DECIMAL(10,2) DEFAULT 0.00,
  new_customers INTEGER DEFAULT 0,
  returning_customers INTEGER DEFAULT 0,
  cart_abandonment_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. ADMIN INSIGHTS & NOTIFICATIONS
-- =====================================================

-- Admin insights / recommendations
CREATE TABLE IF NOT EXISTS admin_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type VARCHAR(50) NOT NULL, -- inventory_alert, price_opportunity, fraud_warning, performance_drop
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  suggested_actions JSONB DEFAULT '[]', -- [{"action": "restock", "product_id": "uuid"}]
  reference_type VARCHAR(50),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'
);

-- Admin notifications center
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- order, payment, inventory, system, approval_required
  title VARCHAR(200) NOT NULL,
  message TEXT,
  action_url TEXT,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- System activity log (what changed today)
CREATE TABLE IF NOT EXISTS system_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type VARCHAR(50) NOT NULL, -- product_created, order_cancelled, customer_registered
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  actor_user_id UUID REFERENCES profiles(id),
  activity_summary VARCHAR(500) NOT NULL,
  changes_snapshot JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 6. FEATURE FLAGS & EXPERIMENTATION
-- =====================================================

-- Feature flags (already exists, extending)
ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  ADD COLUMN IF NOT EXISTS target_user_segment_id UUID, -- REFERENCES customer_segments(id) when created
  ADD COLUMN IF NOT EXISTS target_roles JSONB DEFAULT '[]', -- ["admin", "manager"]
  ADD COLUMN IF NOT EXISTS ab_test_variant VARCHAR(50), -- control, variant_a, variant_b
  ADD COLUMN IF NOT EXISTS metrics_tracked JSONB DEFAULT '[]'; -- ["conversion_rate", "revenue"]

-- A/B test experiments
CREATE TABLE IF NOT EXISTS ab_test_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  feature_flag_id UUID REFERENCES feature_flags(id),
  variants JSONB NOT NULL, -- [{"name": "control", "weight": 50}, {"name": "variant_a", "weight": 50}]
  success_metric VARCHAR(100) NOT NULL, -- conversion_rate, revenue, engagement
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
  winner_variant VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'
);

-- Experiment user assignments
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  session_id VARCHAR(100),
  variant_name VARCHAR(50) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, user_id),
  UNIQUE(experiment_id, session_id)
);

-- =====================================================
-- 7. ADMIN SANDBOX & SAFE MODE
-- =====================================================

-- Admin sandbox sessions
CREATE TABLE IF NOT EXISTS admin_sandbox_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  session_name VARCHAR(100),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  actions_performed INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'
);

-- Sandbox actions log (for preview/dry-run)
CREATE TABLE IF NOT EXISTS sandbox_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sandbox_session_id UUID NOT NULL REFERENCES admin_sandbox_sessions(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB NOT NULL,
  preview_result JSONB,
  impact_summary TEXT,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin action confirmations
CREATE TABLE IF NOT EXISTS admin_action_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action_type VARCHAR(50) NOT NULL, -- bulk_delete, price_change, inventory_adjust
  action_data JSONB NOT NULL,
  impact_summary TEXT NOT NULL, -- "Will delete 150 products"
  requires_reauth BOOLEAN DEFAULT FALSE,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. COMPLIANCE & GDPR
-- =====================================================

-- Data deletion requests (GDPR)
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_type VARCHAR(50) DEFAULT 'full_deletion' CHECK (request_type IN ('full_deletion', 'anonymization', 'data_export')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  requested_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  deletion_notes TEXT,
  export_file_url TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Legal document versions (Terms, Privacy)
CREATE TABLE IF NOT EXISTS legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type VARCHAR(50) NOT NULL, -- terms_of_service, privacy_policy, refund_policy
  version_number VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  is_current BOOLEAN DEFAULT FALSE,
  UNIQUE(document_type, version_number)
);

-- User consent tracking
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL, -- terms_of_service, privacy_policy, marketing_emails
  document_version_id UUID REFERENCES legal_document_versions(id),
  consented BOOLEAN NOT NULL,
  consented_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_promotion_campaigns_active ON promotion_campaigns(is_active, starts_at, ends_at) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_user_id);
CREATE INDEX IF NOT EXISTS idx_cms_pages_slug ON cms_pages(slug) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_cms_page_versions_page ON cms_page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_automation_executions_rule ON automation_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON background_jobs(status, priority) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_user ON funnel_events(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_abandonment_user ON cart_abandonment_snapshots(user_id) WHERE recovered = FALSE;
CREATE INDEX IF NOT EXISTS idx_product_performance_product ON product_performance_stats(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_metrics_date ON sales_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_admin_insights_active ON admin_insights(is_active, severity) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_recipient ON admin_notifications(recipient_user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_system_activity_log_occurred ON system_activity_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_experiment ON ab_test_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status) WHERE status = 'pending';

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE promotion_campaigns IS 'Marketing campaigns with scheduling and budget tracking';
COMMENT ON TABLE product_bundles IS 'Product bundle offers (buy together and save)';
COMMENT ON TABLE free_gift_rules IS 'Free gift with purchase promotions';
COMMENT ON TABLE referral_programs IS 'Customer referral and rewards program';
COMMENT ON TABLE cms_pages IS 'Content management system for static pages with versioning';
COMMENT ON TABLE automation_rules IS 'Business process automation and workflow engine';
COMMENT ON TABLE background_jobs IS 'Async job queue for emails, reports, and batch operations';
COMMENT ON TABLE funnel_events IS 'Conversion funnel analytics and user journey tracking';
COMMENT ON TABLE cart_abandonment_snapshots IS 'Cart abandonment tracking for recovery campaigns';
COMMENT ON TABLE admin_insights IS 'AI-ready insights and recommendations for admin decision support';
COMMENT ON TABLE ab_test_experiments IS 'A/B testing framework for feature experimentation';
COMMENT ON TABLE admin_sandbox_sessions IS 'Safe admin sandbox mode for testing changes without production impact';
COMMENT ON TABLE data_deletion_requests IS 'GDPR compliance - user data deletion and export requests';
