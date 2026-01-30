#!/usr/bin/env node
/**
 * Deployment validation script for Render (or any host).
 *
 * Usage:
 *   APP_URL=https://your-app.onrender.com node scripts/validate-deploy.mjs
 *
 * Exit code:
 *   0 -> healthy
 *   1 -> unhealthy
 */
const baseUrl = process.env.APP_URL || process.env.BASE_URL || "http://localhost:5173";
const url = new URL("/api/healthz", baseUrl);

async function main() {
  try {
    const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}

    if (!res.ok) {
      console.error("[validate-deploy] FAILED:", res.status, res.statusText);
      if (json) console.error(JSON.stringify(json, null, 2));
      else console.error(text);
      process.exit(1);
    }

    if (!json?.ok) {
      console.error("[validate-deploy] FAILED: ok=false");
      console.error(JSON.stringify(json, null, 2));
      process.exit(1);
    }

    console.log("[validate-deploy] OK");
    console.log(JSON.stringify(json, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("[validate-deploy] ERROR:", err?.message || err);
    process.exit(1);
  }
}

main();
