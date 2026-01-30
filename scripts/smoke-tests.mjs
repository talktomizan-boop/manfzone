#!/usr/bin/env node
/**
 * Production smoke tests for the deployed site.
 *
 * Coverage:
 * - Login (optional; requires TEST_EMAIL/TEST_PASSWORD)
 * - Cart: add item
 * - Wishlist: toggle (requires login)
 * - Checkout: create order (guest flow supported)
 * - Invoice rendering (secure endpoint guarded by SMOKE_TEST_SECRET)
 * - Coupon application (optional; requires SMOKE_TEST_COUPON_CODE)
 * - Newsletter subscription (optional; set SMOKE_TEST_NEWSLETTER=false to skip)
 *
 * Usage:
 *   BASE_URL=https://your-app.onrender.com \
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_ANON_KEY=... \
 *   SMOKE_TEST_SECRET=... \
 *   SMOKE_TEST_COUPON_CODE=... \
 *   SMOKE_TEST_NEWSLETTER=true \
 *   node scripts/smoke-tests.mjs
 */
const BASE_URL = process.env.BASE_URL || process.env.APP_URL || "http://localhost:5173";
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_API_KEY;
const SMOKE_TEST_SECRET = process.env.SMOKE_TEST_SECRET || "";
const SMOKE_TEST_COUPON_CODE = process.env.SMOKE_TEST_COUPON_CODE || "";
const SMOKE_TEST_NEWSLETTER = (process.env.SMOKE_TEST_NEWSLETTER || "true").toLowerCase() !== "false";
const TEST_EMAIL = process.env.TEST_EMAIL || "";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[smoke] Missing SUPABASE_URL/SUPABASE_ANON_KEY for product lookup.");
  process.exit(1);
}

class CookieJar {
  constructor() { this.cookies = new Map(); }
  addFromSetCookie(setCookie) {
    if (!setCookie) return;
    // may contain multiple Set-Cookie headers collapsed; split cautiously
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
    return Array.from(this.cookies.entries()).map(([k,v]) => `${k}=${v}`).join("; ");
  }
}

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const txt = await res.text();
  let json = null;
  try { json = JSON.parse(txt); } catch {}
  return { res, txt, json };
}

async function getFirstProduct() {
  const url = new URL("/rest/v1/products", SUPABASE_URL);
  url.searchParams.set("select", "id,slug");
  url.searchParams.set("limit", "1");

  const { res, json, txt } = await fetchJson(url.toString(), {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    }
  });

  if (!res.ok || !Array.isArray(json) || !json[0]?.id) {
    console.error("[smoke] Failed to fetch product from Supabase:", res.status, txt);
    process.exit(1);
  }
  return { id: json[0].id, slug: json[0].slug || null };
}

async function main() {
  const jar = new CookieJar();

  // 1) Health check
  {
    const { res, json, txt } = await fetchJson(new URL("/api/healthz", BASE_URL).toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok || !json?.ok) {
      console.error("[smoke] healthz failed:", res.status, txt);
      process.exit(1);
    }
    console.log("[smoke] healthz ok");
  }

  const product = await getFirstProduct();
  console.log("[smoke] using product:", product);

  // 2.5) Newsletter subscription (direct Supabase REST insert)
  // This validates RLS + insert path without changing any UI.
  if (SMOKE_TEST_NEWSLETTER) {
    const email = `smoke+${Date.now()}@example.com`;
    const url = new URL("/rest/v1/newsletter_subscriptions", SUPABASE_URL);

    const body = JSON.stringify({
      email,
      consent_given: true,
      consent_timestamp: new Date().toISOString(),
      subscribed_from: "smoke",
      metadata: { source: "smoke" },
    });

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=representation",
      },
      body,
    });

    const txt = await res.text();
    if (!res.ok) {
      console.error("[smoke] newsletter subscription failed:", res.status, txt);
      process.exit(1);
    }
    console.log("[smoke] newsletter subscription ok");
  } else {
    console.log("[smoke] skipping newsletter (SMOKE_TEST_NEWSLETTER=false)");
  }

  // 2) Load product detail page (basic routing + SSR)
  {
    const path = product.slug ? `/product-detail/${encodeURIComponent(product.slug)}` : "/products";
    const res = await fetch(new URL(path, BASE_URL).toString(), { headers: { "Cookie": jar.header() } });
    if (!res.ok) {
      console.error("[smoke] product page failed:", res.status, await res.text());
      process.exit(1);
    }
    console.log("[smoke] product page ok");
  }

  // 3) Add to cart (guest)
  {
    const form = new URLSearchParams();
    form.set("intent", "add");
    form.set("product_id", product.id);
    form.set("quantity", "1");

    const res = await fetch(new URL("/cart", BASE_URL).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": jar.header(),
        "Accept": "application/json",
      },
      body: form.toString(),
      redirect: "manual",
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) jar.addFromSetCookie(setCookie);

    if (!res.ok && res.status !== 302) {
      console.error("[smoke] add-to-cart failed:", res.status, await res.text());
      process.exit(1);
    }
    console.log("[smoke] add-to-cart ok");
  }

  // 4) Optional login + wishlist toggle
  if (TEST_EMAIL && TEST_PASSWORD) {
    const form = new URLSearchParams();
    form.set("email", TEST_EMAIL);
    form.set("password", TEST_PASSWORD);

    const res = await fetch(new URL("/login", BASE_URL).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": jar.header(),
      },
      body: form.toString(),
      redirect: "manual",
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) jar.addFromSetCookie(setCookie);

    if (!(res.status === 302 || res.ok)) {
      console.error("[smoke] login failed:", res.status, await res.text());
      process.exit(1);
    }
    console.log("[smoke] login ok");

    // wishlist toggle
    {
      const w = new URLSearchParams();
      w.set("intent", "toggle");
      w.set("product_id", product.id);

      const wRes = await fetch(new URL("/wishlist", BASE_URL).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": jar.header(),
          "Accept": "application/json",
        },
        body: w.toString(),
        redirect: "manual",
      });

      const setCookie2 = wRes.headers.get("set-cookie");
      if (setCookie2) jar.addFromSetCookie(setCookie2);

      if (!wRes.ok && wRes.status !== 302) {
        console.error("[smoke] wishlist toggle failed:", wRes.status, await wRes.text());
        process.exit(1);
      }
      console.log("[smoke] wishlist toggle ok");
    }
  } else {
    console.log("[smoke] skipping login/wishlist (TEST_EMAIL/TEST_PASSWORD not set)");
  }

  // 5) Checkout: place order (guest checkout supported)
  let createdOrderId = null;
  {
    const form = new URLSearchParams();
    form.set("intent", "place_order");
    form.set("email", TEST_EMAIL || "guest@example.com");
    form.set("shipping_full_name", "Smoke Test");
    form.set("shipping_phone", "01700000000");
    form.set("shipping_address_line_1", "Test Street 1");
    form.set("shipping_address_line_2", "");
    form.set("shipping_city", "Dhaka");
    form.set("shipping_state_province", "");
    form.set("shipping_postal_code", "1207");
    form.set("shipping_country", "Bangladesh");
    form.set("payment_method", "cod");

    const checkoutUrl = new URL("/checkout", BASE_URL);
    if (SMOKE_TEST_COUPON_CODE) checkoutUrl.searchParams.set("coupon", SMOKE_TEST_COUPON_CODE);

    const res = await fetch(checkoutUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": jar.header(),
      },
      body: form.toString(),
      redirect: "manual",
    });

    const setCookie = res.headers.get("set-cookie");
    if (setCookie) jar.addFromSetCookie(setCookie);

    if (res.status !== 302) {
      console.error("[smoke] checkout expected redirect, got:", res.status, await res.text());
      process.exit(1);
    }

    const loc = res.headers.get("location") || "";
    const u = new URL(loc, BASE_URL);
    createdOrderId = u.searchParams.get("orderId");
    if (!createdOrderId) {
      console.error("[smoke] could not parse orderId from redirect:", loc);
      process.exit(1);
    }
    console.log("[smoke] order created:", createdOrderId);
  }

  // 6) Confirmation page renders
  {
    const res = await fetch(new URL(`/checkout?step=confirmation&orderId=${encodeURIComponent(createdOrderId)}`, BASE_URL).toString(), {
      headers: { "Cookie": jar.header() },
    });
    if (!res.ok) {
      console.error("[smoke] confirmation page failed:", res.status, await res.text());
      process.exit(1);
    }
    console.log("[smoke] confirmation page ok");
  }

  // 7) Invoice rendering (secure endpoint)
  if (SMOKE_TEST_SECRET) {
    const res = await fetch(new URL(`/api/invoice-preview?orderId=${encodeURIComponent(createdOrderId)}`, BASE_URL).toString(), {
      headers: { "x-smoke-test-secret": SMOKE_TEST_SECRET },
    });
    const html = await res.text();
    if (!res.ok || !html.includes("<html")) {
      console.error("[smoke] invoice preview failed:", res.status, html.slice(0, 500));
      process.exit(1);
    }
    console.log("[smoke] invoice preview ok");

    // 8) Optional: coupon validation (requires SMOKE_TEST_COUPON_CODE)
    if (SMOKE_TEST_COUPON_CODE) {
      const { res: oRes, json: oJson, txt: oTxt } = await fetchJson(
        new URL(`/api/order-summary?orderId=${encodeURIComponent(createdOrderId)}`, BASE_URL).toString(),
        { headers: { "x-smoke-test-secret": SMOKE_TEST_SECRET, Accept: "application/json" } }
      );
      if (!oRes.ok || !oJson?.ok) {
        console.error("[smoke] order-summary failed:", oRes.status, oTxt);
        process.exit(1);
      }
      const applied = String(oJson?.order?.coupon_code || "").toLowerCase() === SMOKE_TEST_COUPON_CODE.toLowerCase();
      if (!applied) {
        console.error("[smoke] coupon not applied:", { expected: SMOKE_TEST_COUPON_CODE, got: oJson?.order?.coupon_code });
        process.exit(1);
      }
      if (!(Number(oJson?.order?.discount_amount || 0) > 0)) {
        console.error("[smoke] coupon applied but discount_amount is not > 0:", oJson?.order);
        process.exit(1);
      }
      console.log("[smoke] coupon applied ok");
    }
  } else {
    console.log("[smoke] skipping invoice preview (SMOKE_TEST_SECRET not set)");
  }

  console.log("[smoke] ALL OK");
}

main().catch((e) => {
  console.error("[smoke] ERROR:", e?.stack || e);
  process.exit(1);
});
