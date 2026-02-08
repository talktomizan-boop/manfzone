import type { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "customer" | "admin" | "super_admin";

type SupabaseUser = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
  email_confirmed_at?: string | null;
};

const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];

export function isAdminRole(role?: string | null): role is UserRole {
  return !!role && ADMIN_ROLES.includes(role as UserRole);
}

function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

function readEnvValue(key: string): string {
  if (typeof process !== "undefined" && process?.env && typeof process.env[key] === "string") {
    return process.env[key] as string;
  }
  if (typeof window !== "undefined" && window.ENV && typeof window.ENV[key] === "string") {
    return window.ENV[key] as string;
  }
  return "";
}

export function getAdminEmailAllowlist(): string[] {
  const rawList = readEnvValue("ADMIN_EMAILS");
  const single = readEnvValue("ADMIN_EMAIL");
  const entries = [rawList, single]
    .filter(Boolean)
    .flatMap((value) => value.split(/[,\s]+/))
    .map((value) => normalizeEmail(value))
    .filter(Boolean);
  return Array.from(new Set(entries));
}

export function isAdminEmail(email?: string | null): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const allowlist = getAdminEmailAllowlist();
  return allowlist.includes(normalized);
}

function readRoleFromMetadata(user?: SupabaseUser | null): UserRole | null {
  if (!user) return null;
  const appRole = user.app_metadata?.role;
  if (typeof appRole === "string") return appRole as UserRole;
  const userRole = user.user_metadata?.role;
  if (typeof userRole === "string") return userRole as UserRole;
  return null;
}

export async function resolveUserRole(
  supabase: SupabaseClient,
  user: SupabaseUser | null,
): Promise<UserRole | null> {
  if (!user?.id) return null;

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();

    if (!error && profile?.role) {
      return profile.role as UserRole;
    }

    if (error) {
      console.error("Role lookup failed:", error);
    }
  } catch (error) {
    console.error("Role lookup exception:", error);
  }

  const metadataRole = readRoleFromMetadata(user);
  if (metadataRole) return metadataRole;

  if (isAdminEmail(user.email)) {
    return "admin";
  }

  return null;
}

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: SupabaseUser | null,
): Promise<UserRole | null> {
  if (!user?.id) return null;

  const email = normalizeEmail(user.email);
  const allowAdmin = isAdminEmail(email);
  const metadataRole = readRoleFromMetadata(user);
  const desiredRole: UserRole = allowAdmin
    ? "admin"
    : metadataRole && ADMIN_ROLES.includes(metadataRole)
      ? metadataRole
      : "customer";

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile lookup failed:", error);
    }

    if (profile?.id) {
      if (allowAdmin && !isAdminRole(profile.role)) {
        const { getSupabaseServiceClient } = await import("~/lib/supabase.service");
        try {
          const service = getSupabaseServiceClient();
          await service.from("profiles").update({ role: "admin" }).eq("id", user.id);
          return "admin";
        } catch (serviceError) {
          console.warn("Unable to elevate admin role via service key:", serviceError);
        }
      }
      return (profile.role as UserRole) || null;
    }

    const fullName = (user.user_metadata as Record<string, unknown> | null)?.full_name;
    const phone = (user.user_metadata as Record<string, unknown> | null)?.phone;

    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      email: email || user.email || "",
      full_name: typeof fullName === "string" ? fullName : null,
      phone: typeof phone === "string" ? phone : null,
      role: desiredRole,
      is_active: true,
      email_verified: Boolean(user.email_confirmed_at),
    });

    if (insertError) {
      console.error("Profile insert failed:", insertError);
      return null;
    }

    return desiredRole;
  } catch (error) {
    console.error("Profile ensure exception:", error);
    return null;
  }
}
