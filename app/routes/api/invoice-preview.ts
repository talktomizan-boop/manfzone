import type { Route } from "./+types/invoice-preview";
import { getSupabaseServiceClient } from "~/lib/supabase.service";
import { renderInvoiceEmail } from "~/lib/email";

/**
 * Secure invoice HTML preview endpoint for automated smoke tests and deployment verification.
 *
 * Guarded by SMOKE_TEST_SECRET to avoid exposing invoice content publicly.
 *
 * Request:
 *   GET /api/invoice-preview?orderId=<uuid>
 *   Header: x-smoke-test-secret: <SMOKE_TEST_SECRET>
 */
export async function loader({ request }: Route.LoaderArgs) {
  const secret = request.headers.get("x-smoke-test-secret") || "";
  const expected = process.env.SMOKE_TEST_SECRET || "";

  if (!expected || secret !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId") || "";
  if (!orderId) {
    return new Response(JSON.stringify({ ok: false, error: "Missing orderId" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const supabase = getSupabaseServiceClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      [
        "id",
        "order_number",
        "created_at",
        "subtotal",
        "discount_amount",
        "tax_amount",
        "shipping_cost",
        "total",
        "email",
        "shipping_full_name",
        "shipping_phone",
        "shipping_address_line_1",
        "shipping_address_line_2",
        "shipping_city",
        "shipping_state_province",
        "shipping_postal_code",
        "shipping_country",
        "billing_full_name",
        "billing_phone",
        "billing_address_line_1",
        "billing_address_line_2",
        "billing_city",
        "billing_state_province",
        "billing_postal_code",
        "billing_country",
        "payment_status",
      ].join(",")
    )
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return new Response(JSON.stringify({ ok: false, error: orderError?.message || "Order not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_name, quantity, unit_price")
    .eq("order_id", orderId);

  if (itemsError) {
    return new Response(JSON.stringify({ ok: false, error: itemsError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  const orderNumber = order.order_number || order.id;
  const invoiceNumber = `INV-${orderNumber}`;

  const shippingAddress = [
    order.shipping_full_name,
    order.shipping_phone,
    [
      order.shipping_address_line_1,
      order.shipping_address_line_2,
      order.shipping_city,
      order.shipping_state_province,
      order.shipping_postal_code,
      order.shipping_country,
    ]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  const billingAddress = [
    order.billing_full_name || order.shipping_full_name,
    order.billing_phone || order.shipping_phone,
    [
      order.billing_address_line_1 || order.shipping_address_line_1,
      order.billing_address_line_2 || order.shipping_address_line_2,
      order.billing_city || order.shipping_city,
      order.billing_state_province || order.shipping_state_province,
      order.billing_postal_code || order.shipping_postal_code,
      order.billing_country || order.shipping_country,
    ]
      .filter(Boolean)
      .join(", "),
  ]
    .filter(Boolean)
    .join("\n");

  const body = renderInvoiceEmail({
    invoiceNumber,
    orderNumber,
    orderId: order.id,
    orderDate: order.created_at || new Date().toISOString(),
    customerName: order.shipping_full_name || "Customer",
    customerEmail: order.email,
    shippingAddress,
    billingAddress,
    items: (items || []).map((i: any) => ({
      name: i.product_name,
      quantity: Number(i.quantity) || 0,
      unitPrice: Number(i.unit_price) || 0,
    })),
    subtotal: Number(order.subtotal) || 0,
    tax: Number(order.tax_amount) || 0,
    discount: Number(order.discount_amount) || 0,
    total: Number(order.total) || 0,
    paymentStatus: (order as any).payment_status || "pending",
  });

  // Smoke tests expect a full HTML document
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${body}</body></html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export default function ApiInvoicePreview() {
  return null;
}
