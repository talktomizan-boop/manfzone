#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const hasSupabase = Boolean(supabaseUrl && (serviceKey || anonKey));

function formatStatus(status) {
  return status.padEnd(12, " ");
}

function printLine(name, status, details = "") {
  const suffix = details ? ` - ${details}` : "";
  // eslint-disable-next-line no-console
  console.log(`${name.padEnd(28, " ")} ${formatStatus(status)}${suffix}`);
}

if (!hasSupabase) {
  printLine("Supabase env", "INACTIVE", "Missing SUPABASE_URL and/or key");
  printLine("Homepage CMS", "INACTIVE", "Supabase not configured");
  printLine("Products", "INACTIVE", "Supabase not configured");
  printLine("Categories", "INACTIVE", "Supabase not configured");
  printLine("Cart", "INACTIVE", "Supabase not configured");
  printLine("Checkout", "INACTIVE", "Supabase not configured");
  printLine("Orders", "INACTIVE", "Supabase not configured");
  printLine("Wishlist", "INACTIVE", "Supabase not configured");
  printLine("Reviews", "INACTIVE", "Supabase not configured");
  printLine("Coupons", "INACTIVE", "Supabase not configured");
  printLine("Admin/Feature Flags", "INACTIVE", "Supabase not configured");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey || anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function checkTable(table) {
  const { error } = await supabase.from(table).select("id", { count: "exact", head: true }).limit(1);
  if (!error) return { ok: true };
  return { ok: false, error: error.message };
}

async function checkRpc(name) {
  const { error } = await supabase.rpc(name);
  if (!error) return { ok: true };
  return { ok: false, error: error.message };
}

const checks = [
  { label: "Homepage CMS", run: () => checkRpc("get_active_homepage_config") },
  { label: "Products", run: () => checkTable("products") },
  { label: "Categories", run: () => checkTable("categories") },
  { label: "Cart", run: () => Promise.all([checkTable("carts"), checkTable("cart_items")]) },
  { label: "Checkout", run: () => Promise.all([checkTable("orders"), checkTable("order_items"), checkTable("payments")]) },
  { label: "Orders", run: () => checkTable("orders") },
  { label: "Wishlist", run: () => checkTable("wishlists") },
  { label: "Reviews", run: () => checkTable("reviews") },
  { label: "Coupons", run: () => checkTable("coupons") },
  { label: "Admin/Feature Flags", run: () => checkTable("feature_flags") },
];

printLine("Supabase env", "ACTIVE");

for (const check of checks) {
  try {
    const result = await check.run();
    if (Array.isArray(result)) {
      const errors = result.filter((entry) => !entry.ok).map((entry) => entry.error);
      if (errors.length === 0) {
        printLine(check.label, "ACTIVE");
      } else {
        printLine(check.label, "PARTIAL", errors.join(" | "));
      }
    } else if (result.ok) {
      printLine(check.label, "ACTIVE");
    } else {
      printLine(check.label, "PARTIAL", result.error);
    }
  } catch (error) {
    printLine(check.label, "INACTIVE", error?.message || "Unexpected error");
  }
}
