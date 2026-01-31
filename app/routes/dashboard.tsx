import { Link } from 'react-router';
import type { Route } from './+types/dashboard';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { createSupabaseServerClient } from '~/lib/supabase';
import { isAdminRole, resolveUserRole } from "~/lib/auth";
import { redirectToLogin, redirectWithHeaders } from '~/lib/redirect';
import styles from './dashboard.module.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'My Dashboard - Manaf Zone' },
    { name: 'description', content: 'Your account overview, orders and loyalty points.' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return redirectToLogin(request, headers);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, email')
    .eq('id', session.user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!profile) return redirectWithHeaders(headers, '/');

  const role = await resolveUserRole(supabase, session.user);
  // Admins should use the admin dashboard.
  if (isAdminRole(role)) {
    return redirectWithHeaders(headers, '/admin/dashboard');
  }

  const [pointsRes, ordersRes] = await Promise.all([
    supabase
      .from('customer_loyalty_points')
      .select('points_balance, lifetime_points_earned, lifetime_points_redeemed, tier')
      .eq('user_id', profile.id)
      .maybeSingle(),
    supabase
      .from('orders')
      .select('id, order_number, total, status, created_at')
      .eq('user_id', profile.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return {
    profile: {
      full_name: profile.full_name || '',
      email: profile.email,
    },
    points: pointsRes.data || {
      points_balance: 0,
      lifetime_points_earned: 0,
      lifetime_points_redeemed: 0,
      tier: 'Standard',
    },
    recentOrders: ordersRes.data || [],
  };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { profile, points, recentOrders } = loaderData as any;

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.title}>Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}</h1>
              <p className={styles.subtitle}>Manage your orders, profile, and loyalty points.</p>
            </div>
            <div className={styles.quickLinks}>
              <Link className={styles.linkButton} to="/orders">Order History</Link>
              <Link className={styles.linkButton} to="/account">Profile Settings</Link>
              <Link className={styles.linkButton} to="/wishlist">Wishlist</Link>
            </div>
          </div>

          <div className={styles.grid}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Loyalty Points</h2>
              <div className={styles.pointsRow}>
                <div>
                  <div className={styles.pointsValue}>{Number(points?.points_balance || 0)}</div>
                  <div className={styles.muted}>Current balance</div>
                </div>
                <div className={styles.badge}>{points?.tier || 'Standard'}</div>
              </div>
              <div className={styles.pointsMeta}>
                <div>
                  <div className={styles.metaLabel}>Earned</div>
                  <div className={styles.metaValue}>{Number(points?.lifetime_points_earned || 0)}</div>
                </div>
                <div>
                  <div className={styles.metaLabel}>Redeemed</div>
                  <div className={styles.metaValue}>{Number(points?.lifetime_points_redeemed || 0)}</div>
                </div>
              </div>
              <p className={styles.tip}>Points can be earned on eligible purchases and redeemed for discounts when available.</p>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <h2 className={styles.cardTitle}>Recent Orders</h2>
                <Link to="/orders" className={styles.smallLink}>View all</Link>
              </div>

              {(!recentOrders || recentOrders.length === 0) ? (
                <div className={styles.empty}>
                  <p>You don't have any orders yet.</p>
                  <Link className={styles.primaryLink} to="/products">Start shopping</Link>
                </div>
              ) : (
                <div className={styles.table}>
                  <div className={styles.tableHeader}>
                    <div>Order</div>
                    <div>Status</div>
                    <div className={styles.alignRight}>Total</div>
                  </div>
                  {recentOrders.map((o: any) => (
                    <Link key={o.id} to={`/orders/${o.id}`} className={styles.tableRow}>
                      <div>
                        <div className={styles.orderNumber}>{o.order_number}</div>
                        <div className={styles.muted}>{new Date(o.created_at).toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka' })}</div>
                      </div>
                      <div className={styles.statusPill}>{o.status}</div>
                      <div className={styles.alignRight}>৳{Number(o.total || 0).toFixed(2)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
