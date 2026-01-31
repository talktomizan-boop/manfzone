import { Form, Link, useActionData, useLoaderData, useNavigation } from 'react-router';
import type { Route } from './+types/account';
import { Header } from '~/components/header/header';
import { Footer } from '~/components/footer/footer';
import { Button } from '~/components/ui/button/button';
import { Input } from '~/components/ui/input/input';
import { Label } from '~/components/ui/label/label';
import { createSupabaseServerClient } from '~/lib/supabase';
import { isAdminRole, resolveUserRole } from "~/lib/auth";
import { redirectToLogin, redirectWithHeaders } from '~/lib/redirect';
import styles from './account.module.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'My Account - Manaf Zone' },
    { name: 'description', content: 'Manage your profile, addresses, and password' },
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

  const role = await resolveUserRole(supabase, session.user);
  if (isAdminRole(role)) {
    return redirectWithHeaders(headers, '/admin/dashboard');
  }

  // NOTE: Some deployments may have an older/minimal `profiles` schema.
  // We try to read the richer columns, but gracefully fall back to auth metadata.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('id', session.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Account profile lookup error:', profileError);
  }

  const { data: addresses } = await supabase
    .from('addresses')
    .select('id,label,full_name,phone,address_line_1,address_line_2,city,state_province,postal_code,country,is_default')
    .eq('user_id', session.user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  return {
    session: {
      user: {
        id: session.user.id,
        email: session.user.email || '',
        // Used as a fallback when the profiles table doesn't contain full_name/phone yet.
        full_name: ((session.user.user_metadata as any)?.full_name || '').toString(),
        phone: ((session.user.user_metadata as any)?.phone || '').toString(),
      },
    },
    profile: profileError ? null : (profile || null),
    addresses: addresses || [],
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = (formData.get('intent') || '').toString();

  const { supabase, headers } = createSupabaseServerClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirectToLogin(request, headers);
  }

  try {
    if (intent === 'update_profile') {
      const full_name = (formData.get('full_name') || '').toString().trim();
      const phone = (formData.get('phone') || '').toString().trim();

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: full_name || null, phone: phone || null })
        .eq('id', session.user.id);

      // If the profiles schema is minimal (missing columns), store data in auth user_metadata
      // so the UI can still show it.
      if (error) {
        console.error('Account profile update error:', error);
        const { error: authErr } = await supabase.auth.updateUser({
          data: {
            full_name: full_name || null,
            phone: phone || null,
          },
        });
        if (authErr) throw authErr;
      }
      return { ok: true, message: 'Profile updated.' };
    }

    if (intent === 'add_address') {
      const payload = {
        user_id: session.user.id,
        label: (formData.get('label') || '').toString().trim() || null,
        full_name: (formData.get('addr_full_name') || '').toString().trim(),
        phone: (formData.get('addr_phone') || '').toString().trim(),
        address_line_1: (formData.get('address_line_1') || '').toString().trim(),
        address_line_2: (formData.get('address_line_2') || '').toString().trim() || null,
        city: (formData.get('city') || '').toString().trim(),
        state_province: (formData.get('state_province') || '').toString().trim() || null,
        postal_code: (formData.get('postal_code') || '').toString().trim() || null,
        country: (formData.get('country') || '').toString().trim() || 'Bangladesh',
        is_default: Boolean(formData.get('is_default')),
      };

      if (!payload.full_name || !payload.phone || !payload.address_line_1 || !payload.city || !payload.country) {
        return { ok: false, error: 'Please fill out the required address fields.' };
      }

      if (payload.is_default) {
        await supabase.from('addresses').update({ is_default: false }).eq('user_id', session.user.id);
      }

      const { error } = await supabase.from('addresses').insert(payload);
      if (error) throw error;
      return { ok: true, message: 'Address saved.' };
    }

    if (intent === 'delete_address') {
      const id = (formData.get('id') || '').toString();
      if (!id) return { ok: false, error: 'Missing address.' };
      const { error } = await supabase.from('addresses').delete().eq('id', id).eq('user_id', session.user.id);
      if (error) throw error;
      return { ok: true, message: 'Address removed.' };
    }

    if (intent === 'set_default_address') {
      const id = (formData.get('id') || '').toString();
      if (!id) return { ok: false, error: 'Missing address.' };
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', session.user.id);
      const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id).eq('user_id', session.user.id);
      if (error) throw error;
      return { ok: true, message: 'Default address updated.' };
    }

    if (intent === 'change_password') {
      const password = (formData.get('password') || '').toString();
      const confirm = (formData.get('confirm') || '').toString();
      if (!password || password.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
      if (password !== confirm) return { ok: false, error: 'Passwords do not match.' };
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { ok: true, message: 'Password updated.' };
    }

    return { ok: false, error: 'Invalid request.' };
  } catch (e: any) {
    console.error('Account action error:', e);
    return { ok: false, error: e?.message || 'Something went wrong.' };
  }
}

function formatAddress(a: any) {
  const parts = [a.address_line_1, a.address_line_2, a.city, a.state_province, a.postal_code, a.country].filter(Boolean);
  return parts.join(', ');
}

export default function Account() {
  const { profile, addresses, session } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className={styles.page}>
      <Header />

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Account</h1>
          <p className={styles.subtitle}>Manage your profile, saved addresses, and password.</p>
        </div>
        <div className={styles.quickLinks}>
          <Link className={styles.linkButton} to="/dashboard">Dashboard</Link>
          <Link className={styles.linkButton} to="/orders">Orders</Link>
          <Link className={styles.linkButton} to="/wishlist">Wishlist</Link>
        </div>

        {actionData?.error && <div className={styles.error}>{actionData.error}</div>}
        {actionData?.message && <div className={styles.success}>{actionData.message}</div>}

        <div className={styles.grid}>
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Profile</h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="update_profile" />
              <div className={styles.field}>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={session.user.email} disabled />
              </div>
              <div className={styles.field}>
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" defaultValue={profile?.full_name || session.user.full_name || ''} />
              </div>
              <div className={styles.field}>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={profile?.phone || session.user.phone || ''} />
              </div>
              <Button type="submit" disabled={isSubmitting}>Save profile</Button>
            </Form>
          </section>

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Saved addresses</h2>

            {(addresses || []).length === 0 ? (
              <p className={styles.muted}>No addresses saved yet.</p>
            ) : (
              <ul className={styles.addressList}>
                {(addresses || []).map((a: any) => (
                  <li key={a.id} className={styles.addressItem}>
                    <div>
                      <div className={styles.addressTitle}>
                        {a.label || 'Address'} {a.is_default ? <span className={styles.pill}>Default</span> : null}
                      </div>
                      <div className={styles.muted}>{a.full_name} • {a.phone}</div>
                      <div className={styles.muted}>{formatAddress(a)}</div>
                    </div>
                    <div className={styles.addressActions}>
                      {!a.is_default && (
                        <Form method="post">
                          <input type="hidden" name="intent" value="set_default_address" />
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" variant="ghost" disabled={isSubmitting}>Set default</Button>
                        </Form>
                      )}
                      <Form method="post">
                        <input type="hidden" name="intent" value="delete_address" />
                        <input type="hidden" name="id" value={a.id} />
                        <Button type="submit" variant="ghost" disabled={isSubmitting}>Remove</Button>
                      </Form>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <details className={styles.details}>
              <summary className={styles.summary}>Add new address</summary>
              <Form method="post" className={styles.form}>
                <input type="hidden" name="intent" value="add_address" />
                <div className={styles.field}>
                  <Label htmlFor="label">Label (optional)</Label>
                  <Input id="label" name="label" placeholder="Home, Office" />
                </div>
                <div className={styles.field}>
                  <Label htmlFor="addr_full_name">Full name</Label>
                  <Input id="addr_full_name" name="addr_full_name" required />
                </div>
                <div className={styles.field}>
                  <Label htmlFor="addr_phone">Phone</Label>
                  <Input id="addr_phone" name="addr_phone" required />
                </div>
                <div className={styles.field}>
                  <Label htmlFor="address_line_1">Address line 1</Label>
                  <Input id="address_line_1" name="address_line_1" required />
                </div>
                <div className={styles.field}>
                  <Label htmlFor="address_line_2">Address line 2 (optional)</Label>
                  <Input id="address_line_2" name="address_line_2" />
                </div>
                <div className={styles.field}>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" required />
                </div>
                <div className={styles.field}>
                  <Label htmlFor="state_province">State/Province (optional)</Label>
                  <Input id="state_province" name="state_province" />
                </div>
                <div className={styles.field}>
                  <Label htmlFor="postal_code">Postal code (optional)</Label>
                  <Input id="postal_code" name="postal_code" />
                </div>
                <div className={styles.field}>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" defaultValue="Bangladesh" required />
                </div>
                <label className={styles.checkboxRow}>
                  <input type="checkbox" name="is_default" />
                  <span>Make default</span>
                </label>
                <Button type="submit" disabled={isSubmitting}>Save address</Button>
              </Form>
            </details>
          </section>

          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>Change password</h2>
            <Form method="post" className={styles.form}>
              <input type="hidden" name="intent" value="change_password" />
              <div className={styles.field}>
                <Label htmlFor="password">New password</Label>
                <Input id="password" name="password" type="password" minLength={8} required />
              </div>
              <div className={styles.field}>
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" name="confirm" type="password" minLength={8} required />
              </div>
              <Button type="submit" disabled={isSubmitting}>Update password</Button>
            </Form>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
