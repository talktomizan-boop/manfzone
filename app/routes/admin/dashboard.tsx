import { useMemo } from "react";
import { Link } from "react-router";
import { AdminLayout } from "~/components/admin-layout/admin-layout";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  UserCheck,
  ArrowRight,
  Info,
} from "lucide-react";
import type { Route } from "./+types/dashboard";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { redirectToLogin, redirectWithHeaders } from "~/lib/redirect.server";
import styles from "./dashboard.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Admin Dashboard - Manaf Zone" },
    {
      name: "description",
      content: "Manage your eCommerce store",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);

  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return redirectToLogin(request, headers);
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return redirectWithHeaders(headers, '/');
  }

  const [productsRes, ordersRes, customersRes] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true).is('deleted_at', null),
    supabase.from('orders').select('id,total,status', { count: 'exact' }).is('deleted_at', null),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer').eq('is_active', true).is('deleted_at', null),
  ]);

  const orders = (ordersRes.data || []) as any[];
  const totalRevenue = orders.reduce((sum, o) => (o.status !== 'cancelled' ? sum + Number(o.total || 0) : sum), 0);

  return {
    stats: {
      revenue: totalRevenue,
      orders: ordersRes.count || orders.length,
      products: productsRes.count || 0,
      customers: customersRes.count || 0,
    },
  };
}

export default function AdminDashboard({ loaderData }: Route.ComponentProps) {
  const stats = useMemo(() => loaderData?.stats || { revenue: 0, orders: 0, products: 0, customers: 0 }, [loaderData]);

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Welcome back! Here's what's happening with your store."
    >
      <div className={styles.infoBanner}>
        <Info size={18} />
        <p>
          You're viewing live store statistics from Supabase. Admin actions and reports are protected by role-based access.
        </p>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statLabel}>Total Revenue</p>
            <DollarSign className={styles.statIcon} />
          </div>
          <h3 className={styles.statValue}>৳{stats.revenue.toFixed(2)}</h3>
          <p className={styles.statChange}>
            <TrendingUp />
            Total from all orders
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statLabel}>Orders</p>
            <ShoppingBag className={styles.statIcon} />
          </div>
          <h3 className={styles.statValue}>{stats.orders}</h3>
          <p className={styles.statChange}>
            <TrendingUp />
            Total orders
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statLabel}>Products</p>
            <Package className={styles.statIcon} />
          </div>
          <h3 className={styles.statValue}>{stats.products}</h3>
          <p className={styles.statChange}>
            <TrendingUp />
            Total products
          </p>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <p className={styles.statLabel}>Customers</p>
            <UserCheck className={styles.statIcon} />
          </div>
          <h3 className={styles.statValue}>{stats.customers}</h3>
          <p className={styles.statChange}>
            <TrendingUp />
            Total customers
          </p>
        </div>
      </div>

      <div className={styles.quickLinks}>
        <h3 className={styles.sectionTitle}>Quick Actions</h3>
        <div className={styles.linkGrid}>
          <Link to="/admin/products" className={styles.quickLink}>
            <Package size={24} />
            <div className={styles.linkContent}>
              <h4>Manage Products</h4>
              <p>Add, edit, or remove products</p>
            </div>
            <ArrowRight size={20} />
          </Link>

          <Link to="/admin/orders" className={styles.quickLink}>
            <ShoppingBag size={24} />
            <div className={styles.linkContent}>
              <h4>View Orders</h4>
              <p>Process and fulfill orders</p>
            </div>
            <ArrowRight size={20} />
          </Link>

          <Link to="/admin/customers" className={styles.quickLink}>
            <UserCheck size={24} />
            <div className={styles.linkContent}>
              <h4>Manage Customers</h4>
              <p>View and edit customer accounts</p>
            </div>
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
