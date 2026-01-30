/**
 * Track Order Page
 * Real-time tracking backed by Supabase orders / shipments / order_state_history.
 */

import { Form, useLoaderData, useNavigate, useSearchParams } from 'react-router';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { Button } from '~/components/ui/button/button';
import { Input } from '~/components/ui/input/input';
import { Badge } from '~/components/ui/badge/badge';
import type { Route } from './+types/track-order';
import styles from './login.module.css';
import { Package, Search, CheckCircle, Truck, Home } from 'lucide-react';
import { createSupabaseServerClient } from '~/lib/supabase.server';

export function meta() {
  return [
    { title: 'Track Order - Manaf Zone' },
    { name: 'description', content: 'Track your order status and delivery information' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const orderNumber = (url.searchParams.get('order') || '').toString().trim();
  const email = (url.searchParams.get('email') || '').toString().trim();

  const { supabase } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!orderNumber) {
    return { query: { orderNumber: '', email: '' }, order: null, shipments: [], history: [] };
  }

  let orderQuery = supabase
    .from('orders')
    .select(
      'id, order_number, created_at, total, status, current_state, email, shipped_at, delivered_at'
    )
    .eq('order_number', orderNumber)
    .is('deleted_at', null);

  if (session?.user?.id) {
    orderQuery = orderQuery.eq('user_id', session.user.id);
  } else if (email) {
    orderQuery = orderQuery.ilike('email', email);
  } else {
    // For guests, require email to avoid leaking order metadata.
    return {
      query: { orderNumber, email },
      order: null,
      shipments: [],
      history: [],
      error: 'Please enter the email used for the order.' as const,
    };
  }

  const { data: order } = await orderQuery.maybeSingle();
  if (!order) {
    return { query: { orderNumber, email }, order: null, shipments: [], history: [] };
  }

  const { data: shipments } = await supabase
    .from('shipments')
    .select('id, tracking_number, carrier, status, shipped_at, estimated_delivery, delivered_at')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false });

  const { data: history } = await supabase
    .from('order_state_history')
    .select('id, to_state, changed_at, reason')
    .eq('order_id', order.id)
    .order('changed_at', { ascending: false });

  return {
    query: { orderNumber, email },
    order,
    shipments: shipments || [],
    history: history || [],
  };
}

export default function TrackOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { query, order, shipments, history, error } = useLoaderData<typeof loader>();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = new URLSearchParams(searchParams);
    const orderNumber = (fd.get('order') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    if (orderNumber) next.set('order', orderNumber);
    else next.delete('order');
    if (email) next.set('email', email);
    else next.delete('email');
    navigate(`/track-order${next.toString() ? `?${next.toString()}` : ''}`);
  };

  const currentStatus = (order?.current_state || order?.status || '').toString() || 'pending';
  const primaryShipment = shipments?.[0] || null;

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.trackOrderLayout}>
            <div className={styles.trackHeader}>
              <h1 className={styles.title}>
                <Package size={32} />
                Track Your Order
              </h1>
              <p className={styles.subtitle}>Enter your order number to see the latest status and delivery information</p>
            </div>

            <div className={styles.trackForm}>
              <Form method="get" onSubmit={onSubmit}>
                <div className={styles.formGroup}>
                  <label htmlFor="order">Order Number</label>
                  <div className={styles.searchInputGroup}>
                    <Input
                      id="order"
                      name="order"
                      type="text"
                      placeholder="e.g., ORD-20250101-000001"
                      defaultValue={query?.orderNumber || ''}
                      required
                    />
                    <Button type="submit">
                      <Search size={18} />
                      Track Order
                    </Button>
                  </div>
                  <p className={styles.helpText}>You can find your order number in your confirmation email</p>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="email">Email (required for guest orders)</label>
                  <Input id="email" name="email" type="email" placeholder="you@example.com" defaultValue={query?.email || ''} />
                </div>
              </Form>
            </div>

            {error && <div style={{ marginTop: 12, color: 'var(--color-error-11)' }}>{error}</div>}

            {query?.orderNumber && (
              <div className={styles.trackingResult}>
                {!order ? (
                  <div className={styles.orderSummary}>
                    <div className={styles.orderHeader}>
                      <div>
                        <h2>Order {query.orderNumber}</h2>
                        <p>We couldn't find an order matching that information.</p>
                      </div>
                      <Badge variant="secondary">Not Found</Badge>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.orderSummary}>
                      <div className={styles.orderHeader}>
                        <div>
                          <h2>Order {order.order_number}</h2>
                          <p>Placed on {new Date(order.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
                        </div>
                        <Badge variant="default">{currentStatus}</Badge>
                      </div>

                      <div className={styles.orderDetails}>
                        <div className={styles.detailItem}>
                          <strong>Total:</strong>
                          <span>৳{Number(order.total).toFixed(2)}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <strong>Tracking Number:</strong>
                          <span>{primaryShipment?.tracking_number || 'Not yet available'}</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.timeline}>
                      <h3>Status History</h3>

                      {(history || []).length === 0 ? (
                        <p className={styles.helpText}>No updates yet.</p>
                      ) : (
                        (history || []).map((h: any, idx: number) => {
                          const isLatest = idx === 0;
                          return (
                            <div key={h.id} className={styles.timelineItem + ' ' + (isLatest ? styles.active : styles.completed)}>
                              <div className={styles.timelineIcon}>
                                {isLatest ? <Truck size={24} /> : <CheckCircle size={24} />}
                              </div>
                              <div className={styles.timelineContent}>
                                <h4>{h.to_state}</h4>
                                <p>{new Date(h.changed_at).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
                                {h.reason && <p className={styles.helpText}>{h.reason}</p>}
                                {isLatest && <Badge variant="default">Current Status</Badge>}
                              </div>
                            </div>
                          );
                        })
                      )}

                      {primaryShipment?.estimated_delivery && (
                        <div className={styles.timelineItem}>
                          <div className={styles.timelineIcon}>
                            <Home size={24} />
                          </div>
                          <div className={styles.timelineContent}>
                            <h4>Estimated Delivery</h4>
                            <p>{new Date(primaryShipment.estimated_delivery).toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
