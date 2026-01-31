#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL || "";
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY || "";

if (!supabaseUrl || !anonKey) {
  console.error("Missing SUPABASE_URL and/or SUPABASE_ANON_KEY.");
  process.exit(1);
}

const adminEmail = process.env.ADMIN_EMAIL || "";
const adminPassword = process.env.ADMIN_PASSWORD || "";
const userEmail = process.env.USER_EMAIL || "";
const userPassword = process.env.USER_PASSWORD || "";

function logLine(label, ok, details = "") {
  const status = ok ? "PASS" : "FAIL";
  const suffix = details ? ` - ${details}` : "";
  console.log(`${label.padEnd(32, " ")} ${status}${suffix}`);
}

async function runUserChecks(label, email, password, expectedRole, allowAllOrders) {
  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData?.user) {
    logLine(`${label} login`, false, authError?.message || "Login failed");
    return;
  }

  logLine(`${label} login`, true);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    logLine(`${label} role`, false, profileError.message);
  } else {
    const roleOk = profile?.role === expectedRole;
    logLine(`${label} role`, roleOk, profile?.role ? `role=${profile.role}` : "missing role");
  }

  const { error: ownOrdersError } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", authData.user.id);

  logLine(`${label} own orders`, !ownOrdersError, ownOrdersError?.message || "");

  const { error: allOrdersError } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true });

  if (allowAllOrders) {
    logLine(`${label} all orders`, !allOrdersError, allOrdersError?.message || "");
  } else {
    logLine(`${label} all orders`, !!allOrdersError, allOrdersError ? "restricted as expected" : "not restricted");
  }
}

if (!adminEmail || !adminPassword || !userEmail || !userPassword) {
  console.error("Missing ADMIN_EMAIL/ADMIN_PASSWORD/USER_EMAIL/USER_PASSWORD env vars.");
  process.exit(1);
}

await runUserChecks("Admin", adminEmail, adminPassword, "admin", true);
await runUserChecks("User", userEmail, userPassword, "customer", false);
