import type { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "customer" | "admin" | "super_admin";

type SupabaseUser = {
  id: string;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

const ADMIN_ROLES: UserRole[] = ["admin", "super_admin"];

export function isAdminRole(role?: string | null): role is UserRole {
  return !!role && ADMIN_ROLES.includes(role as UserRole);
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

  return readRoleFromMetadata(user);
}
