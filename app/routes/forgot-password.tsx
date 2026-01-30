import { Form, Link, useNavigation } from "react-router";
import type { Route } from "./+types/forgot-password";
import { Button } from "~/components/ui/button/button";
import { Input } from "~/components/ui/input/input";
import { Label } from "~/components/ui/label/label";
import { BrandLogo } from "~/components/brand-logo/brand-logo";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { env } from "~/config/environment";
import styles from "./login.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Forgot Password - Manaf Zone" },
    { name: "description", content: "Reset your Manaf Zone account password" },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = (formData.get("email") || "").toString().trim();

  if (!email) {
    return { error: "Email is required" };
  }

  const { supabase } = createSupabaseServerClient(request);

  // Note: redirectTo should point to a route that can handle password reset.
  // If you add a dedicated reset-password route, update this accordingly.
  const redirectTo = `${env.app.url.replace(/\/$/, "")}/login`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className={styles.loginPage}>
      <div className={styles.card}>
        <div className={styles.header}>
          <BrandLogo to="/" text="Manaf Zone" className={styles.logo} />
          <h2 className={styles.title}>Reset Password</h2>
          <p className={styles.subtitle}>Enter your email and we'll send you a reset link</p>
        </div>

        <Form method="post" className={styles.form}>
          {actionData?.error && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "var(--color-error-3)",
                color: "var(--color-error-11)",
                borderRadius: "var(--radius-2)",
                marginBottom: "16px",
              }}
            >
              {actionData.error}
            </div>
          )}

          {actionData?.success && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "var(--color-success-3)",
                color: "var(--color-success-11)",
                borderRadius: "var(--radius-2)",
                marginBottom: "16px",
              }}
            >
              If an account exists for that email, a password reset link has been sent.
            </div>
          )}

          <div className={styles.field}>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>
        </Form>

        <div className={styles.footer}>
          Remembered your password? <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
