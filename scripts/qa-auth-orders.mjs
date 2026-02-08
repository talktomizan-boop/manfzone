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
const BASE_URL = process.env.BASE_URL || process.env.APP_URL || "";

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }
  addFromSetCookie(setCookie) {
    if (!setCookie) return;
    const parts = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const sc of parts) {
      const first = sc.split(";")[0];
      const eq = first.indexOf("=");
      if (eq > 0) {
        const name = first.slice(0, eq).trim();
        const value = first.slice(eq + 1).trim();
        this.cookies.set(name, value);
      }
    }
  }
  header() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

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

if (BASE_URL) {
  const base = new URL(BASE_URL);
  const expectRedirect = async (label, res, expectedPrefix) => {
    const location = res.headers.get("location") || "";
    const ok = res.status === 302 && location.startsWith(expectedPrefix);
    logLine(label, ok, ok ? location : `status=${res.status} location=${location}`);
  };

  // Protected route checks (unauthenticated)
  {
    const res = await fetch(new URL("/admin/dashboard", base).toString(), { redirect: "manual" });
    await expectRedirect("Admin route guard", res, "/login");
  }
  {
    const res = await fetch(new URL("/account", base).toString(), { redirect: "manual" });
    await expectRedirect("Account route guard", res, "/login");
  }

  // Login routing + session persistence
  {
    const jar = new CookieJar();
    const form = new URLSearchParams();
    form.set("email", adminEmail);
    form.set("password", adminPassword);

    const res = await fetch(new URL("/login", base).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      redirect: "manual",
    });
    jar.addFromSetCookie(res.headers.get("set-cookie"));
    await expectRedirect("Admin login redirect", res, "/admin/dashboard");

    const sessionRes = await fetch(new URL("/api/session", base).toString(), {
      headers: { Cookie: jar.header(), Accept: "application/json" },
    });
    const sessionJson = await sessionRes.json().catch(() => null);
    logLine("Admin session persists", sessionJson?.isLoggedIn === true, JSON.stringify(sessionJson));

    const logoutRes = await fetch(new URL("/logout", base).toString(), {
      method: "POST",
      headers: { Cookie: jar.header() },
      redirect: "manual",
    });
    jar.addFromSetCookie(logoutRes.headers.get("set-cookie"));
    await expectRedirect("Admin logout redirect", logoutRes, "/");

    const sessionAfter = await fetch(new URL("/api/session", base).toString(), {
      headers: { Cookie: jar.header(), Accept: "application/json" },
    });
    const sessionAfterJson = await sessionAfter.json().catch(() => null);
    logLine("Admin logout clears", sessionAfterJson?.isLoggedIn === false, JSON.stringify(sessionAfterJson));
  }

  {
    const jar = new CookieJar();
    const form = new URLSearchParams();
    form.set("email", userEmail);
    form.set("password", userPassword);

    const res = await fetch(new URL("/login", base).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      redirect: "manual",
    });
    jar.addFromSetCookie(res.headers.get("set-cookie"));
    await expectRedirect("User login redirect", res, "/");

    const sessionRes = await fetch(new URL("/api/session", base).toString(), {
      headers: { Cookie: jar.header(), Accept: "application/json" },
    });
    const sessionJson = await sessionRes.json().catch(() => null);
    logLine("User session persists", sessionJson?.isLoggedIn === true, JSON.stringify(sessionJson));
  }
}
