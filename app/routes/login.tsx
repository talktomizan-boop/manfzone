import { Form, Link, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/login";
import { Button } from "~/components/ui/button/button";
import { Input } from "~/components/ui/input/input";
import { Label } from "~/components/ui/label/label";
import { BrandLogo } from "~/components/brand-logo/brand-logo";
import { createSupabaseServerClient } from "~/lib/supabase";
import { isAdminRole, resolveUserRole } from "~/lib/auth";
import { getRequestedRedirect, redirectWithHeaders, safeRedirect } from "~/lib/redirect";
import styles from "./login.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login - Manaf Zone" },
    {
      name: "description",
      content: "Sign in to your Manaf Zone account",
    },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url);
  const formData = await request.formData();
  const email = (formData.get('email') || '').toString().trim();
  const password = (formData.get('password') || '').toString();

  const { supabase, headers } = createSupabaseServerClient(request);

  // Sign in with Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: 'Invalid email or password' };
  }

  // Get user profile to check role
  const role = await resolveUserRole(supabase, authData.user);

  // Redirect priority:
  // 1) explicit redirectTo (when a guard sent the user to /login?redirectTo=...)
  // 2) role-based default
  //    - admin / super_admin -> /admin/dashboard
  //    - everyone else -> /account
  const requested = getRequestedRedirect(request, formData);
  const roleDefault = isAdminRole(role) ? "/admin/dashboard" : "/account";
  const requestedPath = requested && requested !== "/" ? requested : null;
  const requestedForRole =
    isAdminRole(role) && requestedPath && !requestedPath.startsWith("/admin") ? null : requestedPath;
  const destination = safeRedirect(requestedForRole, roleDefault);

  // NOTE: Use a raw Response for redirects when auth cookies are involved.
  return redirectWithHeaders(headers, destination);
}

export default function Login({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '';

  return (
    <div className={styles.loginPage}>
      <div className={styles.card}>
        <div className={styles.header}>
          <BrandLogo to="/" text="Manaf Zone" className={styles.logo} />
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.subtitle}>Sign in to your account to continue</p>
        </div>

        <Form method="post" className={styles.form}>
          {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
          {actionData?.error && (
            <div style={{ padding: '12px', backgroundColor: 'var(--color-error-3)', color: 'var(--color-error-11)', borderRadius: 'var(--radius-2)', marginBottom: '16px' }}>
              {actionData.error}
            </div>
          )}

          <div className={styles.field}>
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              name="email"
              type="email" 
              placeholder="you@example.com" 
              disabled={isSubmitting}
              required 
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              name="password"
              type="password" 
              placeholder="••••••••" 
              disabled={isSubmitting}
              required 
            />
            <Link to="/forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? "Signing In..." : "Sign In"}
          </Button>
        </Form>

        <div className={styles.divider}>or</div>

        <div className={styles.footer}>
          Don't have an account? <Link to="/register">Create one now</Link>
        </div>
      </div>
    </div>
  );
}
