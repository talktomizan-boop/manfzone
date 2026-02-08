import { AdminLayout } from '~/components/admin-layout/admin-layout';
import type { Route } from './+types/inventory';
import { createSupabaseServerClient } from '~/lib/supabase';
import { isAdminRole, resolveUserRole } from '~/lib/auth';
import { redirectToLogin, redirectWithHeaders } from '~/lib/redirect';
import styles from './inventory.module.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Inventory - Manaf Zone' },
    { name: 'description', content: 'Multi-warehouse inventory overview, stock status, and reservations.' },
  ];
}

async function requireAdmin(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { ok: false as const, response: redirectToLogin(request, headers) };

  const role = await resolveUserRole(supabase, session.user);

  if (!isAdminRole(role)) {
    return { ok: false as const, response: redirectWithHeaders(headers, '/') };
  }

  return { ok: true as const, supabase, headers };
}

export async function loader({ request }: Route.LoaderArgs) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { supabase } = guard;

  const [warehousesRes, lowStockRes, inventoryRes, reservationsRes] = await Promise.all([
    supabase
      .from('warehouses')
      .select('id, name, code, city, country, is_active, priority')
      .order('priority', { ascending: false }),
    supabase
      .from('warehouse_inventory')
      .select(
        'id, warehouse_id, product_id, variant_id, available_quantity, reorder_point, reorder_quantity, warehouse:warehouses(name), product:products(name)'
      )
      .order('available_quantity', { ascending: true })
      .limit(50),
    supabase
      .from('warehouse_inventory')
      .select(
        'id, warehouse_id, product_id, variant_id, quantity, reserved_quantity, available_quantity, warehouse:warehouses(name), product:products(name)'
      )
      .order('updated_at', { ascending: false })
      .limit(12),
    supabase
      .from('stock_reservations')
      .select(
        'id, warehouse_id, product_id, variant_id, quantity, reserved_at, expires_at, is_active, warehouse:warehouses(name), product:products(name)'
      )
      .order('reserved_at', { ascending: false })
      .limit(10),
  ]);

  const lowStock = (lowStockRes.data || []).filter(
    (row: any) => Number(row.available_quantity || 0) <= Number(row.reorder_point || 0)
  );

  return {
    warehouses: warehousesRes.data || [],
    lowStock: lowStock.slice(0, 12),
    inventory: inventoryRes.data || [],
    reservations: reservationsRes.data || [],
  };
}

export default function AdminInventory({ loaderData }: Route.ComponentProps) {
  const { warehouses, lowStock, inventory, reservations } = loaderData as any;

  return (
    <AdminLayout title="Inventory" subtitle="Monitor multi-warehouse stock, reservations, and low-stock alerts.">
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Warehouses</h3>
        <div className={styles.grid}>
          {(warehouses || []).map((w: any) => (
            <div key={w.id} className={styles.warehouseCard}>
              <div className={styles.warehouseName}>{w.name}</div>
              <div className={styles.warehouseMeta}>{w.code || '—'}</div>
              <div className={styles.warehouseMeta}>
                {[w.city, w.country].filter(Boolean).join(', ') || 'Location not set'}
              </div>
              <div className={styles.badge}>{w.is_active ? 'Active' : 'Inactive'}</div>
            </div>
          ))}
          {(warehouses || []).length === 0 ? (
            <div className={styles.empty}>No warehouses configured yet.</div>
          ) : null}
        </div>
      </section>

      <div className={styles.tableGrid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Low Stock Alerts</h3>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <div>Product</div>
              <div>Warehouse</div>
              <div className={styles.alignRight}>Available</div>
              <div className={styles.alignRight}>Reorder Point</div>
            </div>
            {(lowStock || []).map((row: any) => (
              <div key={row.id} className={styles.tableRow}>
                <div>{row.product?.name || row.product_id}</div>
                <div>{row.warehouse?.name || row.warehouse_id}</div>
                <div className={styles.alignRight}>{row.available_quantity}</div>
                <div className={styles.alignRight}>{row.reorder_point}</div>
              </div>
            ))}
            {(lowStock || []).length === 0 ? (
              <div className={styles.empty}>No low stock items right now.</div>
            ) : null}
          </div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Latest Inventory Updates</h3>
          <div className={styles.table}>
            <div className={styles.tableHeaderWide}>
              <div>Product</div>
              <div>Warehouse</div>
              <div className={styles.alignRight}>On Hand</div>
              <div className={styles.alignRight}>Reserved</div>
              <div className={styles.alignRight}>Available</div>
            </div>
            {(inventory || []).map((row: any) => (
              <div key={row.id} className={styles.tableRowWide}>
                <div>{row.product?.name || row.product_id}</div>
                <div>{row.warehouse?.name || row.warehouse_id}</div>
                <div className={styles.alignRight}>{row.quantity}</div>
                <div className={styles.alignRight}>{row.reserved_quantity}</div>
                <div className={styles.alignRight}>{row.available_quantity}</div>
              </div>
            ))}
            {(inventory || []).length === 0 ? (
              <div className={styles.empty}>No inventory records found.</div>
            ) : null}
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Active Stock Reservations</h3>
        <div className={styles.table}>
          <div className={styles.tableHeaderWide}>
            <div>Product</div>
            <div>Warehouse</div>
            <div className={styles.alignRight}>Qty</div>
            <div className={styles.alignRight}>Reserved</div>
            <div className={styles.alignRight}>Expires</div>
          </div>
          {(reservations || []).map((row: any) => (
            <div key={row.id} className={styles.tableRowWide}>
              <div>{row.product?.name || row.product_id}</div>
              <div>{row.warehouse?.name || row.warehouse_id}</div>
              <div className={styles.alignRight}>{row.quantity}</div>
              <div className={styles.alignRight}>{new Date(row.reserved_at).toLocaleString()}</div>
              <div className={styles.alignRight}>{new Date(row.expires_at).toLocaleString()}</div>
            </div>
          ))}
          {(reservations || []).length === 0 ? (
            <div className={styles.empty}>No active reservations.</div>
          ) : null}
        </div>
      </section>
    </AdminLayout>
  );
}
