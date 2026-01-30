import { Link } from 'react-router';
import type { Route } from './+types/orders';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import { redirectToLogin } from '~/lib/redirect.server';
import styles from './orders.module.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'My Orders - Manaf Zone' },
    { name: 'description', content: 'View your order history' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirectToLogin(request, headers);
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, created_at, total, status, current_state')
    .eq('user_id', session.user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Orders loader error:', error);
  }

  return { orders: orders || [] };
}

export default function Orders({ loaderData }: Route.ComponentProps) {
  const orders = loaderData.orders || [];

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Orders</h1>
          <p className={styles.subtitle}>Track past purchases and see order details</p>
        </div>

        {orders.length === 0 ? (
          <div className={styles.card}>
            <p>You don’t have any orders yet.</p>
            <Link to="/products" className={styles.linkButtonSecondary}>
              Start shopping
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {orders.map((o: any) => (
              <Link key={o.id} to={`/orders/${o.id}`} className={styles.orderCard}>
                <div>
                  <div className={styles.orderNumber}>{o.order_number}</div>
                  <div className={styles.meta}>
                    {new Date(o.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}
                  </div>
                </div>
                <div className={styles.right}>
                  <div className={styles.status}>{o.current_state || o.status}</div>
                  <div className={styles.total}>৳{Number(o.total).toFixed(2)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
