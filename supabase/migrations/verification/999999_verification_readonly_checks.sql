-- READ-ONLY VERIFICATION FILE
-- DO NOT APPLY AS A MIGRATION
-- SAFE FOR MANUAL EXECUTION IN SUPABASE SQL EDITOR
--
-- This file contains ONLY SELECT statements.
-- No schema changes, no triggers, no functions, no writes.
--
-- =========================================================
-- CATEGORIES
-- =========================================================

-- 1) Category inventory + soft-delete visibility
-- What it checks:
--   Counts total categories, active categories, and soft-deleted categories.
-- Correct output:
--   Active/deleted counts should match what you expect to see in the UI.
select
  count(*) as total_categories,
  count(*) filter (where coalesce(is_active, true) = true and deleted_at is null) as active_categories,
  count(*) filter (where deleted_at is not null) as soft_deleted_categories
from categories;

-- 2) Deleted but still active inconsistencies
-- What it checks:
--   Categories that are soft-deleted (deleted_at set) but still marked active.
-- Correct output:
--   Should return 0 rows.
select id, name, slug, is_active, deleted_at
from categories
where deleted_at is not null
  and coalesce(is_active, true) = true
order by deleted_at desc nulls last, id;

-- 3) Duplicate slugs (case-insensitive)
-- What it checks:
--   Duplicate slugs can break linking/filtering.
-- Correct output:
--   Should return 0 rows.
select lower(slug) as slug_normalized, count(*) as cnt
from categories
where slug is not null
group by lower(slug)
having count(*) > 1;

-- 4) Duplicate names (case-insensitive)
-- What it checks:
--   Duplicate names may cause admin confusion or bad UX.
-- Correct output:
--   Should return 0 rows (unless intentionally allowed).
select lower(name) as name_normalized, count(*) as cnt
from categories
where name is not null
group by lower(name)
having count(*) > 1;

-- 5) Slug quality check (null/empty)
-- What it checks:
--   Missing/empty slugs can break query-parameter based category filters.
-- Correct output:
--   Ideally 0 rows unless the app intentionally allows categories without slugs.
select id, name, slug
from categories
where slug is null or btrim(slug) = ''
order by id;


-- =========================================================
-- PRODUCTS ↔ CATEGORIES
-- =========================================================

-- 1) Orphaned product → category references
-- What it checks:
--   Products with category_id pointing to a non-existent category.
-- Correct output:
--   Should return 0 rows.
select p.id as product_id, p.name as product_name, p.category_id
from products p
left join categories c on c.id = p.category_id
where p.category_id is not null
  and c.id is null
order by p.id;

-- 2) Products linked to soft-deleted categories
-- What it checks:
--   Products pointing to categories that have deleted_at set.
-- Correct output:
--   Preferably 0 rows; if non-zero, confirm this is expected and UI behaves as intended.
select
  p.id as product_id,
  p.name as product_name,
  c.id as category_id,
  c.name as category_name,
  c.deleted_at
from products p
join categories c on c.id = p.category_id
where c.deleted_at is not null
order by c.deleted_at desc nulls last, p.id;

-- 3) Category product counts (distribution spot-check)
-- What it checks:
--   Number of products per (non-deleted) category.
-- Correct output:
--   Counts should align with expectations; categories with 0 products are OK if intentional.
select
  c.id,
  c.name,
  c.slug,
  count(p.id) as product_count
from categories c
left join products p on p.category_id = c.id
where c.deleted_at is null
group by c.id, c.name, c.slug
order by product_count desc, c.name asc;

-- 4) Products with missing category
-- What it checks:
--   Products where category_id is null.
-- Correct output:
--   If categories are required, should be 0 rows. If optional, non-zero is acceptable.
select id, name
from products
where category_id is null
order by id
limit 200;


-- =========================================================
-- REFUNDS
-- =========================================================
-- NOTE:
--   This checklist intentionally avoids referencing these commonly-missing columns:
--     refund_approvals.created_at / updated_at / approved_at / rejected_at / admin_notes
--   It checks workflow correctness using columns that your errors indicate DO exist:
--     id, order_id, status, requested_amount, approved_amount, reason

-- 1) Refund request summary by status
-- What it checks:
--   Distribution of refunds by status.
-- Correct output:
--   Status counts should match admin activity (pending/approved/rejected).
select
  status,
  count(*) as count
from refund_approvals
group by status
order by status;

-- 2) Approved refunds missing approved_amount
-- What it checks:
--   Any approved refund should have approved_amount populated.
-- Correct output:
--   Should return 0 rows.
select
  id,
  order_id,
  status,
  requested_amount,
  approved_amount,
  reason
from refund_approvals
where status = 'approved'
  and approved_amount is null
order by id desc;

-- 3) Rejected refunds missing reason
-- What it checks:
--   Rejected refunds should usually record a reason (if your app requires it).
-- Correct output:
--   Should return 0 rows (or only known/intentional exceptions).
select
  id,
  order_id,
  status,
  requested_amount,
  approved_amount,
  reason
from refund_approvals
where status = 'rejected'
  and (reason is null or btrim(reason) = '')
order by id desc;

-- 4) Refund amount sanity checks (negative / exceeds requested)
-- What it checks:
--   Negative refund amounts and approved_amount greater than requested_amount.
-- Correct output:
--   Should return 0 rows.
select
  id,
  order_id,
  status,
  requested_amount,
  approved_amount
from refund_approvals
where
  (requested_amount is not null and requested_amount < 0)
  or
  (approved_amount is not null and approved_amount < 0)
  or
  (approved_amount is not null and requested_amount is not null and approved_amount > requested_amount)
order by id desc;

-- 5) Potential duplicate refund requests per order
-- What it checks:
--   Orders with more than one refund row.
-- Correct output:
--   Ideally 0 rows if policy is one refund request per order; otherwise verify statuses make sense.
select
  order_id,
  count(*) as refund_rows,
  count(*) filter (where status = 'pending') as pending_rows,
  count(*) filter (where status = 'approved') as approved_rows,
  count(*) filter (where status = 'rejected') as rejected_rows
from refund_approvals
group by order_id
having count(*) > 1
order by refund_rows desc, order_id;


-- =========================================================
-- ORDERS & REFUND STATE
-- =========================================================
-- NOTE:
--   This checklist avoids orders.payment_status (missing in your schema).
--   It validates refund state using:
--     orders.current_state and/or orders.status
--     refund_approvals.status='approved'
--     order_state_history.to_state='refunded' (created_at is not assumed to exist)

-- 1) Orders marked refunded without an approved refund record
-- What it checks:
--   Orders that appear refunded but have no approved refund_approvals row.
-- Correct output:
--   Should return 0 rows.
select
  o.id as order_id,
  o.order_number,
  o.status,
  o.current_state
from orders o
left join refund_approvals r
  on r.order_id = o.id and r.status = 'approved'
where (o.current_state = 'refunded' or o.status = 'refunded')
  and r.id is null
order by o.id desc;

-- 2) Approved refund exists but order not transitioned to refunded
-- What it checks:
--   Approved refunds where the related order is not marked refunded.
-- Correct output:
--   Should return 0 rows.
select
  r.id as refund_id,
  r.order_id,
  r.approved_amount,
  o.order_number,
  o.status,
  o.current_state
from refund_approvals r
join orders o on o.id = r.order_id
where r.status = 'approved'
  and not (o.current_state = 'refunded' or o.status = 'refunded')
order by r.id desc;

-- 3) Refunded orders missing an order_state_history "refunded" transition
-- What it checks:
--   Refunded orders should have a to_state='refunded' entry in order_state_history.
-- Correct output:
--   Preferably 0 rows. If non-zero, investigate logging gaps.
select
  o.id as order_id,
  o.order_number,
  o.current_state,
  o.status
from orders o
left join order_state_history h
  on h.order_id = o.id and h.to_state = 'refunded'
where (o.current_state = 'refunded' or o.status = 'refunded')
  and h.id is null
order by o.id desc;

-- 4) Recent state transitions for refunded orders (audit view)
-- What it checks:
--   Shows transitions for refunded orders for spot-checking lifecycle.
-- Correct output:
--   Rows for a refunded order should include a final transition with to_state='refunded'.
--
-- IMPORTANT SAFETY:
--   order_state_history.created_at is NOT assumed to exist (per your error),
--   so ordering uses orders.created_at (hinted to exist) and history id.
select
  h.order_id,
  o.order_number,
  h.from_state,
  h.to_state,
  o.created_at as order_created_at
from order_state_history h
join orders o on o.id = h.order_id
where o.current_state = 'refunded' or o.status = 'refunded'
order by o.created_at desc nulls last, h.id desc
limit 200;

-- 5) Orphaned refund records
-- What it checks:
--   Refund rows referencing an order_id that does not exist.
-- Correct output:
--   Should return 0 rows.
select r.id as refund_id, r.order_id, r.status
from refund_approvals r
left join orders o on o.id = r.order_id
where o.id is null
order by r.id desc;

-- 6) Orphaned order_state_history records (if history exists)
-- What it checks:
--   History rows referencing an order_id that does not exist.
-- Correct output:
--   Should return 0 rows.
select h.id as history_id, h.order_id, h.from_state, h.to_state
from order_state_history h
left join orders o on o.id = h.order_id
where o.id is null
order by h.id desc;
