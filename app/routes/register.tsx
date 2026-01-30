import { Form, Link, useNavigation } from "react-router";
import type { Route } from "./+types/register";
import { Button } from "~/components/ui/button/button";
import { Input } from "~/components/ui/input/input";
import { Label } from "~/components/ui/label/label";
import { BrandLogo } from "~/components/brand-logo/brand-logo";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import styles from "./login.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Create Account - Manaf Zone" },
    {
      name: "description",
      content: "Create your Manaf Zone account",
    },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const full_name = (formData.get('full_name') || '').toString().trim();
  const email = (formData.get('email') || '').toString().trim();
  const password = (formData.get('password') || '').toString();
  const confirm_password = (formData.get('confirm_password') || '').toString();

  if (!full_name) {
    return { error: 'Full name is required' };
  }

  if (!email) {
    return { error: 'Email is required' };
  }

  if (!password) {
    return { error: 'Password is required' };
  }

  if (password !== confirm_password) {
    return { error: 'Passwords do not match' };
  }

  const { supabase, headers } = createSupabaseServerClient(request);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
      },
    },
  });

  if (authError || !authData.user) {
    return { error: authError?.message || 'Registration failed' };
  }

  // Create a profile row if it doesn't already exist.
  // If a DB trigger is used instead, this becomes a no-op.
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', authData.user.id)
    .single();

  if (!existingProfile) {
    await supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      full_name,
      phone: null,
      role: 'customer',
      is_active: true,
      email_verified: false,
    });
  }

  // If email confirmation is required, Supabase may not create a session.
  // Redirect to login either way so the UI flow is predictable.
  headers.set('Location', '/login');
  return new Response(null, { status: 302, headers });
}

export default function Register({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className={styles.loginPage}>
      <div className={styles.card}>
        <div className={styles.header}>
          <BrandLogo to="/" text="Manaf Zone" className={styles.logo} />
          <h2 className={styles.title}>Create Account</h2>
          <p className={styles.subtitle}>Join us and start shopping today</p>
        </div>

        <Form method="post" className={styles.form}>
          {actionData?.error && (
            <div style={{ padding: '12px', backgroundColor: 'var(--color-error-3)', color: 'var(--color-error-11)', borderRadius: 'var(--radius-2)', marginBottom: '16px' }}>
              {actionData.error}
            </div>
          )}

          <div className={styles.field}>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="full_name" type="text" placeholder="John Doe" required disabled={isSubmitting} />
          </div>

          <div className={styles.field}>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required disabled={isSubmitting} />
          </div>

          <div className={styles.field}>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required disabled={isSubmitting} />
          </div>

          <div className={styles.field}>
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input id="confirm-password" name="confirm_password" type="password" placeholder="••••••••" required disabled={isSubmitting} />
          </div>

          <Button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Form>

        <div className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
