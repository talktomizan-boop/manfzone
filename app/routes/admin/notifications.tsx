import { useFetcher } from 'react-router';
import { AdminLayout } from '~/components/admin-layout/admin-layout';
import type { Route } from './+types/notifications';
import { createSupabaseServerClient } from '~/lib/supabase.server';
import { redirectToLogin, redirectWithHeaders } from '~/lib/redirect.server';
import styles from './notifications.module.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Admin Notifications - Manaf Zone' },
    { name: 'description', content: 'System notifications and operational alerts.' },
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
    .select('id, role')
    .eq('id', session.user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return redirectWithHeaders(headers, '/');
  }

  const { data: notifications } = await supabase
    .from('admin_notifications')
    .select('id, notification_type, title, message, action_url, priority, is_read, created_at')
    .eq('recipient_user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const unread = (notifications || []).filter((n: any) => !n.is_read).length;

  return { notifications: notifications || [], unread };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = (formData.get('intent') || '').toString();
  const notificationId = (formData.get('notification_id') || '').toString();

  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return redirectToLogin(request, headers);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', session.user.id)
    .single();

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { ok: false, error: 'Not allowed' };
  }

  if (intent === 'mark_read' && notificationId) {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('recipient_user_id', profile.id);
    return { ok: true };
  }

  if (intent === 'mark_all_read') {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_user_id', profile.id)
      .eq('is_read', false);
    return { ok: true };
  }

  return { ok: false, error: 'Unknown action' };
}

export default function AdminNotifications({ loaderData }: Route.ComponentProps) {
  const { notifications, unread } = loaderData as any;
  const fetcher = useFetcher();

  return (
    <AdminLayout title="Notifications" subtitle="Operational alerts and system events.">
      <div className={styles.topRow}>
        <div className={styles.unread}>{unread} unread</div>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="mark_all_read" />
          <button className={styles.markAll} type="submit" disabled={fetcher.state === 'submitting'}>
            Mark all as read
          </button>
        </fetcher.Form>
      </div>

      {(notifications || []).length === 0 ? (
        <div className={styles.empty}>No notifications yet.</div>
      ) : (
        <div className={styles.list}>
          {notifications.map((n: any) => (
            <div key={n.id} className={`${styles.card} ${n.is_read ? styles.read : styles.unreadCard}`}>
              <div className={styles.cardTop}>
                <div className={styles.type}>{n.notification_type}</div>
                <div className={styles.meta}>
                  <span className={`${styles.priority} ${styles['p_' + (n.priority || 'normal')]}`}>{n.priority || 'normal'}</span>
                  <span>{new Date(n.created_at).toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</span>
                </div>
              </div>

              <div className={styles.title}>{n.title}</div>
              {n.message ? <div className={styles.message}>{n.message}</div> : null}

              <div className={styles.actions}>
                {n.action_url ? (
                  <a className={styles.actionLink} href={n.action_url}>
                    Open
                  </a>
                ) : null}

                {!n.is_read ? (
                  <fetcher.Form method="post">
                    <input type="hidden" name="intent" value="mark_read" />
                    <input type="hidden" name="notification_id" value={n.id} />
                    <button className={styles.markRead} type="submit" disabled={fetcher.state === 'submitting'}>
                      Mark read
                    </button>
                  </fetcher.Form>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
