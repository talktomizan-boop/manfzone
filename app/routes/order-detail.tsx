import { Link } from 'react-router';
import type { Route } from './+types/order-detail';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import { redirectToLogin, redirectWithHeaders } from '~/lib/redirect.server';
import styles from './order-detail.module.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Order Details - Manaf Zone' },
    { name: 'description', content: 'View order details and tracking' },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirectToLogin(request, headers);
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      order_number,
      created_at,
      total,
      subtotal,
      discount_amount,
      shipping_cost,
      tax_amount,
      status,
      current_state,
      email,
      shipping_full_name,
      shipping_phone,
      shipping_address_line_1,
      shipping_address_line_2,
      shipping_city,
      shipping_state_province,
      shipping_postal_code,
      shipping_country
    `
    )
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error('Order detail loader error:', error);
  }

  if (!order) {
    return redirectWithHeaders(headers, '/orders');
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('id, product_name, variant_name, sku, quantity, unit_price, total_price')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true });

  const { data: shipments } = await supabase
    .from('shipments')
    .select('id, tracking_number, carrier, status, shipped_at, estimated_delivery, delivered_at')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false });

  const { data: history } = await supabase
    .from('order_state_history')
    .select('id, from_state, to_state, changed_at, reason, notes')
    .eq('order_id', order.id)
    .order('changed_at', { ascending: false });

  return {
    order,
    items: items || [],
    shipments: shipments || [],
    history: history || [],
  };
}

function formatAddress(o: any) {
  const parts = [
    o.shipping_address_line_1,
    o.shipping_address_line_2,
    o.shipping_city,
    o.shipping_state_province,
    o.shipping_postal_code,
    o.shipping_country,
  ].filter(Boolean);
  return parts.join(', ');
}

export default function OrderDetail({ loaderData }: Route.ComponentProps) {
  const { order, items, shipments, history } = loaderData;
  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.container}>
        <div className={styles.breadcrumbs}>
          <Link to="/orders" className={styles.link}>
            My Orders
          </Link>
          <span className={styles.sep}>/</span>
          <span>{order.order_number}</span>
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>{order.order_number}</h1>
          <div className={styles.headerMeta}>
            <div className={styles.status}>Status: {order.current_state || order.status}</div>
            <div className={styles.meta}>
              {new Date(order.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
            </div>
          </div>
        </div>

        <div className={styles.layout}>
          <div className={styles.main}>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Items</h2>
              <ul className={styles.items}>
                {items.map((i: any) => (
                  <li key={i.id} className={styles.itemRow}>
                    <div>
                      <div className={styles.itemName}>
                        {i.product_name}
                        {i.variant_name ? <span className={styles.muted}> ({i.variant_name})</span> : null}
                      </div>
                      <div className={styles.muted}>SKU: {i.sku}</div>
                    </div>
                    <div className={styles.itemRight}>
                      <div className={styles.muted}>Qty: {i.quantity}</div>
                      <div className={styles.price}>৳{Number(i.total_price).toFixed(2)}</div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className={styles.totals}>
                <div className={styles.totalRow}>
                  <span>Subtotal</span>
                  <span>৳{Number(order.subtotal).toFixed(2)}</span>
                </div>
                <div className={styles.totalRow}>
                  <span>Tax</span>
                  <span>৳{Number(order.tax_amount).toFixed(2)}</span>
                </div>
                <div className={styles.totalRow}>
                  <span>Discount</span>
                  <span>-৳{Number(order.discount_amount).toFixed(2)}</span>
                </div>
                <div className={styles.totalRowStrong}>
                  <span>Total</span>
                  <span>৳{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Tracking</h2>
              {shipments.length === 0 ? (
                <div className={styles.muted}>No shipment has been created for this order yet.</div>
              ) : (
                <ul className={styles.shipments}>
                  {shipments.map((s: any) => (
                    <li key={s.id} className={styles.shipmentRow}>
                      <div>
                        <div className={styles.itemName}>{s.carrier || 'Shipment'}</div>
                        {s.tracking_number && <div className={styles.muted}>Tracking: {s.tracking_number}</div>}
                      </div>
                      <div className={styles.itemRight}>
                        <div className={styles.status}>{s.status}</div>
                        {s.estimated_delivery && (
                          <div className={styles.muted}>
                            ETA: {new Date(s.estimated_delivery).toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka' })}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Status history</h2>
              {history.length === 0 ? (
                <div className={styles.muted}>No status updates yet.</div>
              ) : (
                <ul className={styles.history}>
                  {history.map((h: any) => (
                    <li key={h.id} className={styles.historyRow}>
                      <div className={styles.itemName}>{h.to_state}</div>
                      <div className={styles.muted}>
                        {new Date(h.changed_at).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
                        {h.reason ? ` • ${h.reason}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Shipping</h2>
              <div className={styles.itemName}>{order.shipping_full_name}</div>
              <div className={styles.muted}>{order.shipping_phone}</div>
              <div className={styles.muted}>{formatAddress(order)}</div>
            </div>

            <div className={styles.card}>
              <Link to="/track-order" className={styles.trackLink}>
                Track another order
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
