/// <reference no-default-lib="true" />
/// <reference lib="deno.ns" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWithResend } from '../_shared/resend.ts';

type CartItemRow = {
  quantity: number;
  price: number;
  product: { name: string; slug: string | null } | null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type, x-cron-secret',
    }});
  }

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // Optional dry-run mode for verification/smoke testing.
  // When enabled, no emails are sent and no snapshots are written.
  let dryRun = false;
  try {
    const body = await req.clone().json().catch(() => ({}));
    dryRun = Boolean((body as any)?.dry_run || (body as any)?.dryRun);
  } catch {
    // ignore
  }

  const cronSecret = Deno.env.get('CRON_SECRET') || '';
  if (!cronSecret) {
    return new Response(JSON.stringify({ ok: false, error: 'CRON_SECRET not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (req.headers.get('x-cron-secret') !== cronSecret) {
    return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';
  const from = Deno.env.get('EMAIL_FROM') || 'no-reply@manafzone.com';
  const appUrl = (Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || '').replace(/\/$/, '');

  if (!supabaseUrl || !serviceKey || !resendApiKey || !appUrl) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing env' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: carts, error: cartsError } = await supabase
    .from('carts')
    .select('id, user_id, updated_at')
    .not('user_id', 'is', null)
    .lt('updated_at', cutoff)
    .order('updated_at', { ascending: true })
    .limit(50);

  if (cartsError) {
    return new Response(JSON.stringify({ ok: false, error: cartsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let processed = 0;
  let emailed = 0;
  let candidates = 0;

  for (const cart of carts || []) {
    processed++;
    const cartId = cart.id as string;
    const userId = cart.user_id as string;

    const { data: existing } = await supabase
      .from('cart_abandonment_snapshots')
      .select('id')
      .eq('cart_id', cartId)
      .not('recovery_email_sent_at', 'is', null)
      .eq('recovered', false)
      .limit(1);

    if (existing && existing.length) {
      continue;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    const toEmail = (profile as any)?.email as string | undefined;
    const name = ((profile as any)?.full_name as string | undefined) || 'there';
    if (!toEmail) continue;

    const { data: items, error: itemsError } = await supabase
      .from('cart_items')
      .select('quantity, price, product:products(name, slug)')
      .eq('cart_id', cartId);

    if (itemsError) continue;
    const rows = (items || []) as unknown as CartItemRow[];
    if (!rows.length) continue;

    let total = 0;
    let count = 0;
    const snapshotItems = rows.map((r) => {
      const qty = Number(r.quantity) || 0;
      const price = Number(r.price) || 0;
      total += qty * price;
      count += qty;
      return {
        name: r.product?.name || 'Product',
        slug: r.product?.slug || null,
        quantity: qty,
        unit_price: price,
      };
    });

    const cartLink = appUrl + '/cart';
    const subject = 'You left items in your cart';

    const lineItems = snapshotItems
      .slice(0, 8)
      .map((it) => '<li>' + it.name + ' × ' + it.quantity + '</li>')
      .join('');

    const html =
      '<div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111;line-height:1.5">' +
      '<h2 style="margin:0 0 12px">Hi ' + name + ',</h2>' +
      '<p style="margin:0 0 12px">You still have items in your cart. Complete checkout before they sell out.</p>' +
      '<ul style="margin:0 0 12px;padding-left:18px">' + lineItems + '</ul>' +
      '<p style="margin:0 0 12px"><strong>Total:</strong> ৳' + total.toFixed(2) + '</p>' +
      '<p style="margin:0"><a href="' + cartLink + '" style="color:#2563eb;text-decoration:none">Return to your cart</a></p>' +
      '</div>';

    candidates++;

    if (!dryRun) {
      try {
        await sendWithResend({ apiKey: resendApiKey, from, to: toEmail, subject, html });
      } catch {
        continue;
      }

      emailed++;

      await supabase.from('cart_abandonment_snapshots').insert({
        cart_id: cartId,
        user_id: userId,
        cart_value: total,
        item_count: count,
        cart_snapshot: { items: snapshotItems },
        abandoned_at: (cart.updated_at as string) || new Date().toISOString(),
        recovery_email_sent_at: new Date().toISOString(),
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed, candidates, emailed, dryRun }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
