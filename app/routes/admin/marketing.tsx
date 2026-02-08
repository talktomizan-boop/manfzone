import { useMemo } from 'react';
import { AdminLayout } from '~/components/admin-layout/admin-layout';
import type { Route } from './+types/marketing';
import { createSupabaseServerClient } from '~/lib/supabase';
import { isAdminRole, resolveUserRole } from '~/lib/auth';
import { redirectToLogin, redirectWithHeaders } from '~/lib/redirect';
import { env } from '~/config/environment';
import { renderCartAbandonmentEmail, sendEmail } from '~/lib/email';
import styles from './marketing.module.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Marketing - Manaf Zone' },
    { name: 'description', content: 'Campaigns, bundles, referrals, and cart recovery tools.' },
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

  const [campaignsRes, bundlesRes, referralsRes, abandonmentRes] = await Promise.all([
    supabase
      .from('promotion_campaigns')
      .select('id, name, campaign_type, starts_at, ends_at, is_active, current_uses, max_uses')
      .order('starts_at', { ascending: false })
      .limit(10),
    supabase
      .from('product_bundles')
      .select('id, name, bundle_type, is_active, discount_type, discount_value, bundle_price')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('referral_programs')
      .select('id, name, referrer_reward_type, referrer_reward_value, referee_reward_type, referee_reward_value, is_active')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('cart_abandonment_snapshots')
      .select('id, cart_id, user_id, cart_value, item_count, abandoned_at, recovered, cart_snapshot')
      .order('abandoned_at', { ascending: false })
      .limit(12),
  ]);

  const abandonedCarts = (abandonmentRes.data || []) as any[];
  const userIds = abandonedCarts.map((c) => c.user_id).filter(Boolean);
  const profilesRes = userIds.length
    ? await supabase.from('profiles').select('id, email, full_name').in('id', userIds)
    : { data: [] };

  const profiles = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));

  return {
    campaigns: campaignsRes.data || [],
    bundles: bundlesRes.data || [],
    referrals: referralsRes.data || [],
    abandonedCarts: abandonedCarts.map((c) => ({
      ...c,
      profile: c.user_id ? profiles.get(c.user_id) : null,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { supabase } = guard;
  const formData = await request.formData();
  const intent = (formData.get('intent') || '').toString();

  if (intent === 'send_recovery_email') {
    const snapshotId = (formData.get('snapshot_id') || '').toString();
    if (!snapshotId) return { ok: false, error: 'Missing snapshot id.' };

    const { data: snapshot, error } = await supabase
      .from('cart_abandonment_snapshots')
      .select('id, cart_id, user_id, cart_value, cart_snapshot')
      .eq('id', snapshotId)
      .single();

    if (error || !snapshot) return { ok: false, error: 'Abandoned cart not found.' };

    const profile = snapshot.user_id
      ? await supabase.from('profiles').select('email, full_name').eq('id', snapshot.user_id).maybeSingle()
      : { data: null };

    const snapshotData = (snapshot as any).cart_snapshot || {};
    const cartItems = Array.isArray(snapshotData.items) ? snapshotData.items : [];
    const customerEmail =
      snapshotData.email ||
      snapshotData.customer?.email ||
      profile.data?.email ||
      null;

    if (!customerEmail) {
      return { ok: false, error: 'No customer email available for this cart.' };
    }

    const items = cartItems.map((item: any) => ({
      name: item.product_name || item.product?.name || 'Cart item',
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unit_price || item.price || 0),
    }));

    const subtotal = Number(snapshot.cart_value || 0);
    const appUrl = env.app.url;

    const html = renderCartAbandonmentEmail({
      customerName: profile.data?.full_name || snapshotData.customer?.name,
      items,
      subtotal,
      appUrl,
      resumeUrl: `${appUrl.replace(/\\/$/, '')}/cart`,
    });

    await sendEmail({
      to: customerEmail,
      subject: 'You left items in your cart',
      html,
    });

    return { ok: true };
  }

  return { ok: false, error: 'Unknown action' };
}

export default function AdminMarketing({ loaderData, actionData }: Route.ComponentProps) {
  const { campaigns, bundles, referrals, abandonedCarts } = loaderData as any;
  const banner = useMemo(() => actionData as any, [actionData]);

  return (
    <AdminLayout title="Marketing" subtitle="Run campaigns, bundles, referrals, and cart recovery workflows.">
      {banner?.ok ? <div className={styles.success}>Recovery email queued.</div> : null}
      {banner?.error ? <div className={styles.error}>{banner.error}</div> : null}

      <div className={styles.grid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Promotion Campaigns</h3>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <div>Name</div>
              <div>Type</div>
              <div>Status</div>
              <div className={styles.alignRight}>Uses</div>
            </div>
            {(campaigns || []).map((c: any) => (
              <div key={c.id} className={styles.tableRow}>
                <div>{c.name}</div>
                <div>{c.campaign_type}</div>
                <div>{c.is_active ? 'Active' : 'Paused'}</div>
                <div className={styles.alignRight}>
                  {c.current_uses || 0}/{c.max_uses ?? '∞'}
                </div>
              </div>
            ))}
            {(campaigns || []).length === 0 ? (
              <div className={styles.empty}>No campaigns created yet.</div>
            ) : null}
          </div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Product Bundles</h3>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <div>Name</div>
              <div>Type</div>
              <div>Status</div>
              <div className={styles.alignRight}>Discount</div>
            </div>
            {(bundles || []).map((b: any) => (
              <div key={b.id} className={styles.tableRow}>
                <div>{b.name}</div>
                <div>{b.bundle_type}</div>
                <div>{b.is_active ? 'Active' : 'Paused'}</div>
                <div className={styles.alignRight}>
                  {b.discount_type ? `${b.discount_value || 0}${b.discount_type === 'percent' ? '%' : ''}` : b.bundle_price}
                </div>
              </div>
            ))}
            {(bundles || []).length === 0 ? (
              <div className={styles.empty}>No bundles configured yet.</div>
            ) : null}
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Referral Programs</h3>
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div>Name</div>
            <div>Referrer Reward</div>
            <div>Referee Reward</div>
            <div>Status</div>
          </div>
          {(referrals || []).map((r: any) => (
            <div key={r.id} className={styles.tableRow}>
              <div>{r.name}</div>
              <div>{r.referrer_reward_value} {r.referrer_reward_type}</div>
              <div>{r.referee_reward_value} {r.referee_reward_type}</div>
              <div>{r.is_active ? 'Active' : 'Paused'}</div>
            </div>
          ))}
          {(referrals || []).length === 0 ? (
            <div className={styles.empty}>No referral programs yet.</div>
          ) : null}
        </div>
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Cart Abandonment Recovery</h3>
        <div className={styles.table}>
          <div className={styles.tableHeaderWide}>
            <div>Cart</div>
            <div>Customer</div>
            <div className={styles.alignRight}>Value</div>
            <div className={styles.alignRight}>Items</div>
            <div className={styles.alignRight}>Action</div>
          </div>
          {(abandonedCarts || []).map((c: any) => (
            <div key={c.id} className={styles.tableRowWide}>
              <div>{c.cart_id}</div>
              <div>{c.profile?.email || c.cart_snapshot?.email || 'Guest'}</div>
              <div className={styles.alignRight}>৳{Number(c.cart_value || 0).toFixed(2)}</div>
              <div className={styles.alignRight}>{c.item_count || 0}</div>
              <div className={styles.alignRight}>
                {c.recovered ? (
                  <span className={styles.badge}>Recovered</span>
                ) : (
                  <form method="post">
                    <input type="hidden" name="intent" value="send_recovery_email" />
                    <input type="hidden" name="snapshot_id" value={c.id} />
                    <button className={styles.linkButton} type="submit">
                      Send Email
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
          {(abandonedCarts || []).length === 0 ? (
            <div className={styles.empty}>No abandoned carts recorded.</div>
          ) : null}
        </div>
      </section>
    </AdminLayout>
  );
}
