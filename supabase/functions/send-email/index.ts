/// <reference no-default-lib="true" />
/// <reference lib="deno.ns" />

import { sendWithResend } from '../_shared/resend.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Restrict this function to service-role callers only.
  // verify_jwt=true validates the signature, but normal user JWTs would also pass.
  // To prevent abuse (spam), enforce role=service_role.
  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Authorization token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let role: string | null = null;
  try {
    const parts = token.split('.');
    const payloadB64 = parts[1] || '';
    let b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (b64.length % 4)) % 4;
    if (padLen) b64 = b64 + '='.repeat(padLen);
    const json = atob(b64);
    const payload = JSON.parse(json);
    role = String(payload?.role || '');
  } catch {
    role = null;
  }

  if (role !== 'service_role') {
    return new Response(JSON.stringify({ ok: false, error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const defaultFrom = Deno.env.get('EMAIL_FROM') || 'no-reply@manafzone.com';

  if (!resendApiKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing RESEND_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const to = String(payload.to || '').trim();
  const subject = String(payload.subject || '').trim();
  const html = String(payload.html || '').trim();
  const text = payload.text ? String(payload.text) : undefined;
  const from = String(payload.from || defaultFrom).trim();

  if (!to || !to.includes('@') || !subject || !html || !from) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing to/subject/html/from' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await sendWithResend({ apiKey: resendApiKey, from, to, subject, html, text });
    return new Response(JSON.stringify({ ok: true, id: result.id || null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as any)?.message || e) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
