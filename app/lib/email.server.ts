import nodemailer from 'nodemailer';

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

function getTransport(): { transporter: nodemailer.Transporter; from: string } | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM;

  if (!host || !user || !pass || !from) {
    console.warn('[email] SMTP not fully configured; skipping', {
      hasHost: !!host,
      hasUser: !!user,
      hasPass: !!pass,
      hasFrom: !!from,
    });
    return null;
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    from,
  };
}

async function sendEmailViaSupabaseResend({ to, subject, html }: SendEmailArgs) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const from = process.env.EMAIL_FROM;

  if (!supabaseUrl || !serviceKey || !from) {
    console.warn('[email] supabase_resend not fully configured; skipping', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!serviceKey,
      hasFrom: !!from,
    });
    return { skipped: true } as const;
  }

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ to, subject, html, from }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn('[email] supabase_resend failed', { status: res.status, body: body.slice(0, 400) });
    return { skipped: false, ok: false } as const;
  }

  return { skipped: false, ok: true } as const;
}

export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();

  if (provider === 'supabase_resend') {
    return sendEmailViaSupabaseResend({ to, subject, html });
  }

  const t = getTransport();
  if (!t) {
    // Production-safe no-op when SMTP isn't configured.
    console.warn('[email] SMTP not configured; skipping send', { to, subject });
    return { skipped: true } as const;
  }

  try {
    await t.transporter.sendMail({ from: t.from, to, subject, html });
  } catch (err: any) {
    console.warn('[email] SMTP send failed', { message: err?.message || String(err) });
    return { skipped: false, ok: false } as const;
  }
  return { skipped: false } as const;
}

function money(n: number) {
  return `৳${n.toFixed(2)}`;
}

export function renderOrderConfirmationEmail(params: {
  orderNumber: string;
  orderId: string;
  orderDate: string;
  customerName: string;
  total: number;
  appUrl: string;
}) {
  const { orderNumber, orderId, orderDate, customerName, total, appUrl } = params;

  return `
  <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111; line-height:1.5">
    <h2 style="margin:0 0 12px">Thanks for your order, ${escapeHtml(customerName || 'there')}!</h2>
    <p style="margin:0 0 16px">We received your order <strong>${escapeHtml(orderNumber)}</strong> on ${escapeHtml(
    orderDate
  )}.</p>
    <div style="padding:12px 16px; border:1px solid #e5e7eb; border-radius:12px; background:#fafafa; margin:0 0 16px">
      <p style="margin:0"><strong>Total:</strong> ${money(total)}</p>
      <p style="margin:8px 0 0"><a href="${escapeAttr(
        `${appUrl.replace(/\/$/, '')}/orders/${orderId}`
      )}" style="color:#2563eb; text-decoration:none">View your order</a></p>
    </div>
    <p style="margin:0">We’ll email you when it ships.</p>
  </div>
  `.trim();
}

export function renderInvoiceEmail(params: {
  invoiceNumber: string;
  orderNumber: string;
  orderId: string;
  orderDate: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  billingAddress: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentStatus: string;
}) {
  const {
    invoiceNumber,
    orderNumber,
    orderId,
    orderDate,
    customerName,
    customerEmail,
    shippingAddress,
    billingAddress,
    items,
    subtotal,
    tax,
    discount,
    total,
    paymentStatus,
  } = params;

  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb">${escapeHtml(i.name)}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right">${i.quantity}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right">${money(i.unitPrice)}</td>
        <td style="padding:10px 8px; border-bottom:1px solid #e5e7eb; text-align:right">${money(
          i.unitPrice * i.quantity
        )}</td>
      </tr>
    `
    )
    .join('');

  return `
  <div style="font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111; line-height:1.5">
    <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:16px">
      <div>
        <h2 style="margin:0 0 6px">Invoice</h2>
        <div style="color:#6b7280">Invoice #${escapeHtml(invoiceNumber)}</div>
        <div style="color:#6b7280">Order #${escapeHtml(orderNumber)}</div>
        <div style="color:#6b7280">Order ID: ${escapeHtml(orderId)}</div>
        <div style="color:#6b7280">Date: ${escapeHtml(orderDate)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:600">Payment Status</div>
        <div style="padding:6px 10px; display:inline-block; border-radius:999px; background:#f3f4f6; border:1px solid #e5e7eb">${escapeHtml(
          paymentStatus
        )}</div>
      </div>
    </div>

    <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:16px">
      <div style="flex:1; min-width:260px; padding:12px 16px; border:1px solid #e5e7eb; border-radius:12px">
        <div style="font-weight:600; margin-bottom:6px">Billed To</div>
        <div>${escapeHtml(customerName)}<br/>${escapeHtml(customerEmail)}<br/>${escapeHtml(billingAddress)}</div>
      </div>
      <div style="flex:1; min-width:260px; padding:12px 16px; border:1px solid #e5e7eb; border-radius:12px">
        <div style="font-weight:600; margin-bottom:6px">Ship To</div>
        <div>${escapeHtml(shippingAddress)}</div>
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden">
      <thead>
        <tr style="background:#f9fafb">
          <th style="text-align:left; padding:10px 8px; border-bottom:1px solid #e5e7eb">Item</th>
          <th style="text-align:right; padding:10px 8px; border-bottom:1px solid #e5e7eb">Qty</th>
          <th style="text-align:right; padding:10px 8px; border-bottom:1px solid #e5e7eb">Unit</th>
          <th style="text-align:right; padding:10px 8px; border-bottom:1px solid #e5e7eb">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div style="margin-top:16px; display:flex; justify-content:flex-end">
      <table style="width:320px; border-collapse:collapse">
        <tr>
          <td style="padding:6px 0; color:#6b7280">Subtotal</td>
          <td style="padding:6px 0; text-align:right">${money(subtotal)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0; color:#6b7280">Tax</td>
          <td style="padding:6px 0; text-align:right">${money(tax)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0; color:#6b7280">Discount</td>
          <td style="padding:6px 0; text-align:right">-${money(discount)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0; font-weight:700; border-top:1px solid #e5e7eb">Total</td>
          <td style="padding:10px 0; text-align:right; font-weight:700; border-top:1px solid #e5e7eb">${money(
            total
          )}</td>
        </tr>
      </table>
    </div>

    <p style="margin:16px 0 0; color:#6b7280">Keep this email for your records.</p>
  </div>
  `.trim();
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/`/g, '&#096;');
}
