import { useEffect, useMemo, useState } from 'react';
import { useFetcher } from 'react-router';
import { AdminLayout } from '~/components/admin-layout/admin-layout';
import type { Route } from './+types/settings';
import { createSupabaseServerClient } from '~/lib/supabase';
import { isAdminRole, resolveUserRole } from "~/lib/auth";
import { redirectToLogin, redirectWithHeaders } from '~/lib/redirect';
import { Button } from '~/components/ui/button/button';
import styles from './settings.module.css';

type StoreSettings = Record<string, any>;

const DEFAULT_SITE: StoreSettings = {
  storeName: 'Manaf Zone',
  storeEmail: 'support@manafzone.com',
  storePhone: '+880 1XXX-XXXXXX',
  storeAddress: 'Dhaka, Bangladesh',
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
};

const DEFAULT_THEME: StoreSettings = {
  primaryColor: '#2563eb',
  secondaryColor: '#16a34a',
  fontFamily: 'Inter',
  darkMode: false,
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Admin Settings - Manaf Zone' },
    { name: 'description', content: 'Store settings, theme controls, and feature flags.' },
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

  return { ok: true as const, supabase, headers, profile: { id: session.user.id, role } };
}

export async function loader({ request }: Route.LoaderArgs) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { supabase } = guard;

  const [settingsRes, flagsRes] = await Promise.all([
    supabase.from('store_settings').select('key, value').in('key', ['site', 'theme']),
    supabase.from('feature_flags').select('id, key, name, description, is_enabled, rollout_percentage').order('name', { ascending: true }),
  ]);

  const settingsRows = (settingsRes.data || []) as any[];
  const site = settingsRows.find((r) => r.key === 'site')?.value || DEFAULT_SITE;
  const theme = settingsRows.find((r) => r.key === 'theme')?.value || DEFAULT_THEME;

  return {
    site,
    theme,
    featureFlags: flagsRes.data || [],
  };
}

export async function action({ request }: Route.ActionArgs) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const { supabase, profile } = guard;
  const formData = await request.formData();
  const intent = (formData.get('intent') || '').toString();

  const upsertSettings = async (key: string, value: any) => {
    const { error } = await supabase.from('store_settings').upsert({
      key,
      value,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  };

  if (intent === 'save_site') {
    const payload = {
      storeName: (formData.get('storeName') || '').toString(),
      storeEmail: (formData.get('storeEmail') || '').toString(),
      storePhone: (formData.get('storePhone') || '').toString(),
      storeAddress: (formData.get('storeAddress') || '').toString(),
      currency: (formData.get('currency') || '').toString(),
      timezone: (formData.get('timezone') || '').toString(),
    };
    return upsertSettings('site', payload);
  }

  if (intent === 'save_theme') {
    const payload = {
      primaryColor: (formData.get('primaryColor') || '').toString(),
      secondaryColor: (formData.get('secondaryColor') || '').toString(),
      fontFamily: (formData.get('fontFamily') || '').toString(),
      darkMode: (formData.get('darkMode') || '').toString() === 'true',
    };
    return upsertSettings('theme', payload);
  }

  if (intent === 'save_features') {
    const flagIds = formData.getAll('flag_id').map((v) => v.toString());
    const updates = flagIds.map((id) => ({
      id,
      is_enabled: (formData.get(`enabled_${id}`) || '') === 'on',
      rollout_percentage: Math.max(0, Math.min(100, parseInt((formData.get(`rollout_${id}`) || '100').toString(), 10) || 0)),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('feature_flags').upsert(updates);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  return { ok: false, error: 'Unknown action' };
}

export default function AdminSettings({ loaderData }: Route.ComponentProps) {
  const { site, theme, featureFlags } = loaderData as any;
  const [activeTab, setActiveTab] = useState<'site' | 'theme' | 'features'>('site');
  const fetcher = useFetcher();

  const isSaving = fetcher.state === 'submitting';
  const savedOk = !!(fetcher.data && (fetcher.data as any).ok);
  const saveError = fetcher.data && (fetcher.data as any).error ? String((fetcher.data as any).error) : '';

  const [siteSettings, setSiteSettings] = useState(DEFAULT_SITE);
  const [themeSettings, setThemeSettings] = useState(DEFAULT_THEME);

  useEffect(() => {
    setSiteSettings({ ...DEFAULT_SITE, ...(site || {}) });
    setThemeSettings({ ...DEFAULT_THEME, ...(theme || {}) });
  }, [site, theme]);

  const flags = useMemo(() => (featureFlags || []) as any[], [featureFlags]);

  return (
    <AdminLayout title="Settings" subtitle="Configure your store, theme, and feature flags.">
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'site' ? styles.activeTab : ''}`} onClick={() => setActiveTab('site')}>
          Store
        </button>
        <button className={`${styles.tab} ${activeTab === 'theme' ? styles.activeTab : ''}`} onClick={() => setActiveTab('theme')}>
          Theme
        </button>
        <button className={`${styles.tab} ${activeTab === 'features' ? styles.activeTab : ''}`} onClick={() => setActiveTab('features')}>
          Features
        </button>
      </div>

      <div className={styles.content}>
        {savedOk ? <div className={styles.success}>Saved!</div> : null}
        {saveError ? <div className={styles.error}>{saveError}</div> : null}

        {activeTab === 'site' && (
          <fetcher.Form method="post" className={styles.form}>
            <input type="hidden" name="intent" value="save_site" />
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Store Information</h3>
              <div className={styles.grid}>
                <label className={styles.label}>
                  Store Name
                  <input className={styles.input} name="storeName" value={siteSettings.storeName} onChange={(e) => setSiteSettings((s) => ({ ...s, storeName: e.target.value }))} />
                </label>
                <label className={styles.label}>
                  Email
                  <input className={styles.input} name="storeEmail" value={siteSettings.storeEmail} onChange={(e) => setSiteSettings((s) => ({ ...s, storeEmail: e.target.value }))} />
                </label>
                <label className={styles.label}>
                  Phone
                  <input className={styles.input} name="storePhone" value={siteSettings.storePhone} onChange={(e) => setSiteSettings((s) => ({ ...s, storePhone: e.target.value }))} />
                </label>
                <label className={styles.label}>
                  Address
                  <input className={styles.input} name="storeAddress" value={siteSettings.storeAddress} onChange={(e) => setSiteSettings((s) => ({ ...s, storeAddress: e.target.value }))} />
                </label>
                <label className={styles.label}>
                  Currency
                  <select className={styles.input} name="currency" value={siteSettings.currency} onChange={(e) => setSiteSettings((s) => ({ ...s, currency: e.target.value }))}>
                    <option value="BDT">BDT (৳)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </label>
                <label className={styles.label}>
                  Timezone
                  <select className={styles.input} name="timezone" value={siteSettings.timezone} onChange={(e) => setSiteSettings((s) => ({ ...s, timezone: e.target.value }))}>
                    <option value="Asia/Dhaka">Asia/Dhaka</option>
                    <option value="UTC">UTC</option>
                  </select>
                </label>
              </div>
              <div className={styles.actions}>
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Store Settings'}</Button>
              </div>
            </div>
          </fetcher.Form>
        )}

        {activeTab === 'theme' && (
          <fetcher.Form method="post" className={styles.form}>
            <input type="hidden" name="intent" value="save_theme" />
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Theme</h3>
              <div className={styles.grid}>
                <label className={styles.label}>
                  Primary Color
                  <input className={styles.input} name="primaryColor" value={themeSettings.primaryColor} onChange={(e) => setThemeSettings((t) => ({ ...t, primaryColor: e.target.value }))} />
                </label>
                <label className={styles.label}>
                  Secondary Color
                  <input className={styles.input} name="secondaryColor" value={themeSettings.secondaryColor} onChange={(e) => setThemeSettings((t) => ({ ...t, secondaryColor: e.target.value }))} />
                </label>
                <label className={styles.label}>
                  Font Family
                  <select className={styles.input} name="fontFamily" value={themeSettings.fontFamily} onChange={(e) => setThemeSettings((t) => ({ ...t, fontFamily: e.target.value }))}>
                    <option value="Inter">Inter</option>
                    <option value="System">System</option>
                    <option value="Poppins">Poppins</option>
                  </select>
                </label>
                <label className={styles.label}>
                  Dark Mode
                  <select className={styles.input} name="darkMode" value={String(!!themeSettings.darkMode)} onChange={(e) => setThemeSettings((t) => ({ ...t, darkMode: e.target.value === 'true' }))}>
                    <option value="false">Off</option>
                    <option value="true">On</option>
                  </select>
                </label>
              </div>
              <div className={styles.actions}>
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Theme Settings'}</Button>
              </div>
            </div>
          </fetcher.Form>
        )}

        {activeTab === 'features' && (
          <fetcher.Form method="post" className={styles.form}>
            <input type="hidden" name="intent" value="save_features" />
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Feature Flags</h3>
              <p className={styles.muted}>Toggle features live. Rollout % lets you gradually enable features (backed by the <code>feature_flags</code> table).</p>

              <div className={styles.flagList}>
                {flags.map((f) => (
                  <div key={f.id} className={styles.flagRow}>
                    <input type="hidden" name="flag_id" value={f.id} />
                    <div>
                      <div className={styles.flagName}>{f.name || f.key}</div>
                      {f.description ? <div className={styles.flagDesc}>{f.description}</div> : null}
                      <div className={styles.flagKey}>{f.key}</div>
                    </div>
                    <div className={styles.flagControls}>
                      <label className={styles.switch}>
                        <input type="checkbox" name={`enabled_${f.id}`} defaultChecked={!!f.is_enabled} />
                        <span>Enabled</span>
                      </label>
                      <label className={styles.rollout}>
                        Rollout
                        <input className={styles.rolloutInput} type="number" min={0} max={100} name={`rollout_${f.id}`} defaultValue={f.rollout_percentage ?? 100} />
                        %
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.actions}>
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Feature Flags'}</Button>
              </div>
            </div>
          </fetcher.Form>
        )}
      </div>
    </AdminLayout>
  );
}
