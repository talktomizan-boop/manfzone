import { AdminLayout } from '~/components/admin-layout/admin-layout';
import type { Route } from './+types/insights';
import { createSupabaseServerClient } from '~/lib/supabase';
import { redirectToLogin, redirectWithHeaders } from '~/lib/redirect';
import styles from './insights.module.css';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Admin Insights - Manaf Zone' },
    { name: 'description', content: 'Data visualizations and operational insights for your store.' },
  ];
}

function getDhakaDateString(d: Date) {
  // ISO-like, but stable for charts
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return redirectToLogin(request, headers);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', session.user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return redirectWithHeaders(headers, '/');
  }

  const now = new Date();
  const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const start14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const start30Iso = start30.toISOString();
  const start14Iso = start14.toISOString();

  const [ordersRes, itemsRes, metricsRes, insightsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, total, created_at')
      .gte('created_at', start30Iso)
      .is('deleted_at', null),
    supabase
      .from('order_items')
      .select('product_name, quantity, total_price, created_at')
      .gte('created_at', start30Iso),
    supabase
      .from('sales_metrics')
      .select('metric_date, total_orders, total_revenue')
      .gte('metric_date', getDhakaDateString(start14))
      .order('metric_date', { ascending: true }),
    supabase
      .from('admin_insights')
      .select('id, insight_type, severity, title, description, suggested_actions, created_at')
      .eq('is_active', true)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  const orders = (ordersRes.data || []) as any[];
  const items = (itemsRes.data || []) as any[];
  const salesMetrics = (metricsRes.data || []) as any[];
  const insights = (insightsRes.data || []) as any[];

  // Status breakdown (last 30 days)
  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    const s = String(o.status || 'unknown');
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const statusSeries = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Top products by revenue (last 30 days)
  const productAgg = items.reduce<Record<string, { name: string; qty: number; revenue: number }>>((acc, it) => {
    const name = String(it.product_name || 'Unknown');
    const key = name;
    const qty = Number(it.quantity || 0);
    const revenue = Number(it.total_price || 0);
    if (!acc[key]) acc[key] = { name, qty: 0, revenue: 0 };
    acc[key].qty += qty;
    acc[key].revenue += revenue;
    return acc;
  }, {});

  const topProducts = Object.values(productAgg)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // Revenue series (prefer sales_metrics if available; fallback to orders)
  let revenueSeries: Array<{ date: string; revenue: number; orders: number }> = [];
  if (salesMetrics.length > 0) {
    revenueSeries = salesMetrics.map((m) => ({
      date: m.metric_date,
      revenue: Number(m.total_revenue || 0),
      orders: Number(m.total_orders || 0),
    }));
  } else {
    const byDay = new Map<string, { revenue: number; orders: number }>();
    orders
      .filter((o) => new Date(o.created_at).getTime() >= start14.getTime())
      .forEach((o) => {
        const day = getDhakaDateString(new Date(o.created_at));
        const entry = byDay.get(day) || { revenue: 0, orders: 0 };
        entry.orders += 1;
        if (String(o.status) !== 'cancelled') entry.revenue += Number(o.total || 0);
        byDay.set(day, entry);
      });

    // Fill gaps
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = getDhakaDateString(d);
      const e = byDay.get(key) || { revenue: 0, orders: 0 };
      revenueSeries.push({ date: key, revenue: e.revenue, orders: e.orders });
    }
  }

  const kpis = {
    revenue30: orders.reduce((sum, o) => (String(o.status) !== 'cancelled' ? sum + Number(o.total || 0) : sum), 0),
    orders30: orders.length,
    avgOrderValue: orders.length ? orders.reduce((sum, o) => sum + Number(o.total || 0), 0) / orders.length : 0,
  };

  return {
    kpis,
    revenueSeries,
    statusSeries,
    topProducts,
    insights,
  };
}

export default function AdminInsights({ loaderData }: Route.ComponentProps) {
  const { kpis, revenueSeries, statusSeries, topProducts, insights } = loaderData as any;

  const statusColors = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0ea5e9'];

  return (
    <AdminLayout title="Insights" subtitle="Track key metrics and discover operational opportunities.">
      <div className={styles.kpiRow}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Revenue (30d)</div>
          <div className={styles.kpiValue}>৳{Number(kpis.revenue30 || 0).toFixed(2)}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Orders (30d)</div>
          <div className={styles.kpiValue}>{kpis.orders30 || 0}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Avg Order Value</div>
          <div className={styles.kpiValue}>৳{Number(kpis.avgOrderValue || 0).toFixed(2)}</div>
        </div>
      </div>

      <div className={styles.chartGrid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Revenue (Last 14 Days)</h3>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueSeries}>
                <XAxis dataKey="date" tickMargin={8} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Orders (Last 14 Days)</h3>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueSeries}>
                <XAxis dataKey="date" tickMargin={8} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Order Status Breakdown (30d)</h3>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusSeries} dataKey="value" nameKey="name" outerRadius={90}>
                  {statusSeries.map((_: any, idx: number) => (
                    <Cell key={idx} fill={statusColors[idx % statusColors.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Top Products (30d)</h3>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <div>Product</div>
              <div className={styles.alignRight}>Qty</div>
              <div className={styles.alignRight}>Revenue</div>
            </div>
            {(topProducts || []).map((p: any) => (
              <div key={p.name} className={styles.tableRow}>
                <div className={styles.productName}>{p.name}</div>
                <div className={styles.alignRight}>{p.qty}</div>
                <div className={styles.alignRight}>৳{Number(p.revenue || 0).toFixed(2)}</div>
              </div>
            ))}
            {(!topProducts || topProducts.length === 0) ? (
              <div className={styles.empty}>No product sales data found in the last 30 days.</div>
            ) : null}
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Operational Insights</h3>
        <p className={styles.muted}>These come from the <code>admin_insights</code> table. You can generate them via scheduled jobs or admin tools.</p>

        {(insights || []).length === 0 ? (
          <div className={styles.empty}>No active insights right now.</div>
        ) : (
          <div className={styles.insightGrid}>
            {(insights || []).map((i: any) => (
              <div key={i.id} className={styles.insightCard}>
                <div className={styles.insightTop}>
                  <div className={`${styles.sev} ${styles['sev_' + (i.severity || 'info')]}`}>{i.severity || 'info'}</div>
                  <div className={styles.insightMeta}>{new Date(i.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</div>
                </div>
                <div className={styles.insightTitle}>{i.title}</div>
                {i.description ? <div className={styles.insightDesc}>{i.description}</div> : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
