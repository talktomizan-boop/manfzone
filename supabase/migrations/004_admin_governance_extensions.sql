-- =====================================================
-- MIGRATION 004: ADMIN GOVERNANCE & SECURITY EXTENSIONS
-- =====================================================
-- Purpose: Advanced admin permissions, audit trails, and security controls
-- Author: System
-- Date: 2024

-- =====================================================
-- 1. ADMIN PERMISSIONS & ROLE HIERARCHY
-- =====================================================

-- Admin permission types (granular control)
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  resource VARCHAR(100) NOT NULL, -- products, orders, customers, etc.
  action VARCHAR(50) NOT NULL, -- view, create, edit, delete, export, approve
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Roles management tables commented out until user management is implemented
-- These will be uncommented when auth system is ready

-- CREATE TABLE IF NOT EXISTS roles (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(50) NOT NULL UNIQUE,
--   description TEXT,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- CREATE TABLE IF NOT EXISTS role_permissions (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
--   permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   UNIQUE(role_id, permission_id)
-- );

-- Time-bound role elevation (temporary admin access)
CREATE TABLE IF NOT EXISTS role_elevations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  elevated_to_role user_role NOT NULL,
  original_role user_role NOT NULL,
  reason TEXT NOT NULL,
  elevated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  elevated_by UUID NOT NULL REFERENCES profiles(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'
);

-- Admin session tracking (device and IP monitoring)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET NOT NULL,
  user_agent TEXT,
  device_fingerprint TEXT,
  location_country VARCHAR(2),
  location_city VARCHAR(100),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  metadata JSONB DEFAULT '{}'
);

-- IP access control (allow/deny lists)
CREATE TABLE IF NOT EXISTS admin_ip_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  ip_range CIDR,
  rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('allow', 'deny')),
  applies_to_role user_role,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Privileged action re-authentication log
CREATE TABLE IF NOT EXISTS admin_reauth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  action_type VARCHAR(100) NOT NULL,
  reauth_method VARCHAR(50) NOT NULL, -- password, 2fa, biometric
  reauth_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  success BOOLEAN NOT NULL,
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 2. PRODUCT LIFECYCLE & WORKFLOW
-- =====================================================

-- Product lifecycle states
CREATE TABLE IF NOT EXISTS product_lifecycle_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE, -- draft, pending_review, approved, published, archived
  description TEXT,
  color VARCHAR(20),
  order_index INTEGER NOT NULL DEFAULT 0,
  is_terminal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product workflow history
CREATE TABLE IF NOT EXISTS product_workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_state VARCHAR(50),
  to_state VARCHAR(50) NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET
);

-- Add lifecycle_state to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS lifecycle_state VARCHAR(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_unpublish_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cloned_from_product_id UUID REFERENCES products(id);

-- Product approval queue
CREATE TABLE IF NOT EXISTS product_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Product attribute templates
CREATE TABLE IF NOT EXISTS product_attribute_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category_id UUID REFERENCES categories(id),
  attributes JSONB NOT NULL DEFAULT '[]', -- [{"name": "Size", "type": "select", "options": ["S","M","L"]}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE
);

-- Product cross-sell / upsell rules
CREATE TABLE IF NOT EXISTS product_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommended_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  recommendation_type VARCHAR(20) NOT NULL CHECK (recommendation_type IN ('cross_sell', 'upsell', 'related')),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(product_id, recommended_product_id, recommendation_type)
);

-- Product price history
CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2), -- for margin calculation
  changed_by UUID NOT NULL REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 3. INVENTORY & WAREHOUSE EXTENSIONS
-- =====================================================

-- Warehouses / fulfillment centers
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(2),
  postal_code VARCHAR(20),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Multi-warehouse inventory
CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  reorder_point INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 50,
  last_restocked_at TIMESTAMPTZ,
  batch_number VARCHAR(100),
  lot_number VARCHAR(100),
  expiry_date DATE,
  cost_per_unit DECIMAL(10,2),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(warehouse_id, product_id, variant_id, batch_number)
);

-- Stock reservation (at checkout)
CREATE TABLE IF NOT EXISTS stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_by_order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  reserved_by_cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Inventory movement log
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL, -- purchase, sale, return, adjustment, transfer, damage
  quantity_change INTEGER NOT NULL, -- positive or negative
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_type VARCHAR(50), -- order, purchase_order, transfer, manual
  reference_id UUID,
  reason TEXT,
  cost_impact DECIMAL(10,2),
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Supplier management
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE,
  contact_person VARCHAR(100),
  email VARCHAR(100),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(2),
  payment_terms TEXT,
  lead_time_days INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Product-supplier mapping
CREATE TABLE IF NOT EXISTS product_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_sku VARCHAR(100),
  cost_price DECIMAL(10,2),
  minimum_order_quantity INTEGER DEFAULT 1,
  lead_time_days INTEGER,
  is_preferred BOOLEAN DEFAULT FALSE,
  last_ordered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, supplier_id)
);

-- =====================================================
-- 4. ADVANCED ORDER MANAGEMENT SYSTEM (OMS)
-- =====================================================

-- Order states (custom state machine)
CREATE TABLE IF NOT EXISTS order_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20),
  icon VARCHAR(50),
  order_index INTEGER NOT NULL DEFAULT 0,
  is_terminal BOOLEAN DEFAULT FALSE,
  is_cancellable BOOLEAN DEFAULT TRUE,
  requires_payment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order state transitions (state machine rules)
CREATE TABLE IF NOT EXISTS order_state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_state_name VARCHAR(50),
  to_state_name VARCHAR(50) NOT NULL,
  requires_permission VARCHAR(100),
  requires_reauth BOOLEAN DEFAULT FALSE,
  auto_transition BOOLEAN DEFAULT FALSE,
  transition_delay_seconds INTEGER,
  is_active BOOLEAN DEFAULT TRUE
);

-- Order state history
CREATE TABLE IF NOT EXISTS order_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_state VARCHAR(50),
  to_state VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  notes TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}'
);

-- Add state columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS current_state VARCHAR(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS hold_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS assigned_to_warehouse_id UUID REFERENCES warehouses(id),
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'web', -- web, phone, whatsapp, manual
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Order splits (multi-warehouse fulfillment)
CREATE TABLE IF NOT EXISTS order_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  split_order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  reason TEXT
);

-- Partial shipments
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id),
  tracking_number VARCHAR(100) UNIQUE,
  carrier VARCHAR(100),
  shipped_at TIMESTAMPTZ,
  estimated_delivery TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'pending', -- pending, shipped, in_transit, delivered, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Shipment items
CREATE TABLE IF NOT EXISTS shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. PAYMENTS & FINANCE EXTENSIONS
-- =====================================================

-- Payment reconciliation
CREATE TABLE IF NOT EXISTS payment_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  reconciled_amount DECIMAL(10,2) NOT NULL,
  reconciled_at TIMESTAMPTZ DEFAULT NOW(),
  reconciled_by UUID NOT NULL REFERENCES profiles(id),
  bank_reference VARCHAR(100),
  settlement_date DATE,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'discrepancy', 'resolved')),
  metadata JSONB DEFAULT '{}'
);

-- COD settlement tracking
CREATE TABLE IF NOT EXISTS cod_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  collected_amount DECIMAL(10,2) NOT NULL,
  collected_at TIMESTAMPTZ,
  collected_by VARCHAR(100), -- courier/agent name
  remitted_amount DECIMAL(10,2),
  remitted_at TIMESTAMPTZ,
  settlement_reference VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'remitted', 'settled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Refund approvals workflow
CREATE TABLE IF NOT EXISTS refund_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id),
  requested_amount DECIMAL(10,2) NOT NULL,
  approved_amount DECIMAL(10,2),
  requested_by UUID NOT NULL REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  reason TEXT,
  reviewer_notes TEXT,
  refund_method VARCHAR(50), -- original_payment, store_credit, bank_transfer
  metadata JSONB DEFAULT '{}'
);

-- Store credit / wallet system
CREATE TABLE IF NOT EXISTS customer_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  currency VARCHAR(3) DEFAULT 'BDT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES customer_wallets(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- credit, debit, refund, bonus, adjustment
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reference_type VARCHAR(50), -- order, refund, promotion
  reference_id UUID,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Tax configuration
CREATE TABLE IF NOT EXISTS tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  country VARCHAR(2),
  state VARCHAR(100),
  tax_type VARCHAR(50), -- vat, gst, sales_tax
  rate DECIMAL(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
  applies_to_category_id UUID REFERENCES categories(id),
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- 6. CUSTOMER OPERATIONS & CRM
-- =====================================================

-- Customer segments
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  criteria JSONB NOT NULL, -- {"total_orders": {"min": 10}, "total_spent": {"min": 10000}}
  color VARCHAR(20),
  icon VARCHAR(50),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE
);

-- Customer segment membership (auto-computed)
CREATE TABLE IF NOT EXISTS customer_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(segment_id, user_id)
);

-- Customer tags
CREATE TABLE IF NOT EXISTS customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(20),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-tag mapping
CREATE TABLE IF NOT EXISTS user_customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES customer_tags(id) ON DELETE CASCADE,
  added_by UUID REFERENCES profiles(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tag_id)
);

-- Customer notes (internal)
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general', -- general, support, fraud, vip
  is_pinned BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer timeline events (aggregated view)
CREATE TABLE IF NOT EXISTS customer_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- order, refund, support, note, tag
  event_title VARCHAR(200) NOT NULL,
  event_description TEXT,
  reference_type VARCHAR(50),
  reference_id UUID,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'
);

-- Fraud risk indicators
CREATE TABLE IF NOT EXISTS customer_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  risk_type VARCHAR(50) NOT NULL, -- multiple_returns, chargeback, fake_address, velocity
  risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  flagged_by UUID REFERENCES profiles(id),
  flagged_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'
);

-- Customer blacklist/whitelist
CREATE TABLE IF NOT EXISTS customer_access_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email VARCHAR(255),
  phone VARCHAR(20),
  ip_address INET,
  access_type VARCHAR(20) NOT NULL CHECK (access_type IN ('blacklist', 'whitelist')),
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Loyalty tiers
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  minimum_points INTEGER DEFAULT 0,
  minimum_spend DECIMAL(10,2) DEFAULT 0,
  benefits JSONB DEFAULT '[]', -- [{"type": "discount", "value": 10}]
  color VARCHAR(20),
  icon VARCHAR(50),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Customer loyalty points
CREATE TABLE IF NOT EXISTS customer_loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  available_points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  current_tier_id UUID REFERENCES loyalty_tiers(id),
  tier_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Points transactions
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- earn, redeem, expire, adjust
  points INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_type VARCHAR(50), -- order, refund, bonus
  reference_id UUID,
  description TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for role permissions will be added when roles table is implemented
CREATE INDEX IF NOT EXISTS idx_role_elevations_user_active ON role_elevations(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_active ON admin_sessions(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_admin_sessions_ip ON admin_sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_product_workflow_history_product ON product_workflow_history(product_id);
CREATE INDEX IF NOT EXISTS idx_product_approvals_status ON product_approvals(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_product_recommendations_product ON product_recommendations(product_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_warehouse ON warehouse_inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_product ON warehouse_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_low_stock ON warehouse_inventory(warehouse_id, product_id) WHERE available_quantity <= reorder_point;
CREATE INDEX IF NOT EXISTS idx_stock_reservations_active ON stock_reservations(product_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse ON inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_order_state_history_order ON order_state_history(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_payment ON payment_reconciliations(payment_id);
CREATE INDEX IF NOT EXISTS idx_cod_settlements_status ON cod_settlements(status);
CREATE INDEX IF NOT EXISTS idx_refund_approvals_status ON refund_approvals(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_customer_segment_members_segment ON customer_segment_members(segment_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_customer_segment_members_user ON customer_segment_members(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_customer_timeline_events_user ON customer_timeline_events(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_risk_flags_user_active ON customer_risk_flags(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE admin_permissions IS 'Granular permissions for admin actions (view, edit, delete, export, etc.)';
COMMENT ON TABLE role_elevations IS 'Time-bound temporary role elevation for elevated privileges';
COMMENT ON TABLE admin_sessions IS 'Admin session tracking with device fingerprinting and IP monitoring';
COMMENT ON TABLE product_lifecycle_states IS 'Product workflow states (draft, pending_review, approved, published, archived)';
COMMENT ON TABLE warehouse_inventory IS 'Multi-warehouse inventory with stock reservation support';
COMMENT ON TABLE stock_reservations IS 'Stock reserved during checkout to prevent overselling';
COMMENT ON TABLE inventory_movements IS 'Complete audit trail of all inventory changes';
COMMENT ON TABLE order_state_transitions IS 'State machine rules for order lifecycle';
COMMENT ON TABLE shipments IS 'Partial shipment support for split fulfillment';
COMMENT ON TABLE payment_reconciliations IS 'Payment reconciliation for accounting and finance';
COMMENT ON TABLE customer_wallets IS 'Store credit and wallet system for refunds and promotions';
COMMENT ON TABLE customer_segments IS 'Customer segmentation based on behavior and value';
COMMENT ON TABLE customer_risk_flags IS 'Fraud detection and risk management';
COMMENT ON TABLE loyalty_tiers IS 'Customer loyalty program tiers and benefits';
