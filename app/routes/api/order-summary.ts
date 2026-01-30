import type { Route } from "./+types/order-summary";
import { getSupabaseServiceClient } from "~/lib/supabase.service.server";

/**
 * Secure JSON order summary endpoint for automated smoke tests.
 *
 * Guarded by SMOKE_TEST_SECRET to avoid exposing order details publicly.
 *
 * Request:
 *   GET /api/order-summary?orderId=<uuid>
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

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_number, email, subtotal, discount_amount, total, coupon_code, coupon_id, created_at")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    return new Response(JSON.stringify({ ok: false, error: error?.message || "Order not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        email: order.email,
        subtotal: Number(order.subtotal) || 0,
        discount_amount: Number(order.discount_amount) || 0,
        total: Number(order.total) || 0,
        coupon_code: (order as any).coupon_code || null,
        coupon_id: (order as any).coupon_id || null,
        created_at: order.created_at,
      },
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    }
  );
}

export default function ApiOrderSummary() {
  return null;
}
