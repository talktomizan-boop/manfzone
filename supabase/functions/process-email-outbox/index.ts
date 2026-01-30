/// <reference no-default-lib="true" />
/// <reference lib="deno.ns" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWithResend } from '../_shared/resend.ts';

type OutboxRow = {
  id: string;
  email_type: string;
  to_email: string;
  from_email: string | null;
  subject: string;
  html: string;
  attempts: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type, x-cron-secret',
      },
    });
  }

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  // Optional dry-run mode for verification/smoke testing.
  // When enabled, no emails are sent and no rows are modified.
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PROJECT_URL') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const resendKey = Deno.env.get('RESEND_API_KEY') || '';
  const defaultFrom = Deno.env.get('EMAIL_FROM') || 'no-reply@example.com';

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Supabase env' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!resendKey) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing RESEND_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: rows, error } = await supabase
    .from('email_outbox')
    .select('id,email_type,to_email,from_email,subject,html,attempts')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at', { ascending: true })
    .limit(25);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const outbox = (rows || []) as OutboxRow[];

  if (dryRun) {
    return new Response(JSON.stringify({ ok: true, processed: outbox.length, wouldSend: outbox.length, dryRun: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let sent = 0;
  let failed = 0;

  for (const row of outbox) {
    try {
      await sendWithResend({
        apiKey: resendKey,
        from: row.from_email || defaultFrom,
        to: row.to_email,
        subject: row.subject,
        html: row.html,
      });

      await supabase
        .from('email_outbox')
        .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', row.id);

      sent++;
    } catch (e) {
      const msg = (e as any)?.message || 'Unknown error';
      await supabase
        .from('email_outbox')
        .update({
          status: 'failed',
          attempts: (row.attempts || 0) + 1,
          last_error: msg.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id);

      failed++;
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: outbox.length, sent, failed, dryRun: false }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
