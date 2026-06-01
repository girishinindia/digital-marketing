import type { RoleSlug } from "@/types";

export type Permission =
  | "companies.manage"
  | "admins.manage"
  | "catalog.manage"      // platforms, content types, post types, mappings
  | "users.manage"        // company-scoped users
  | "grants.manage"       // assign post/content types to users
  | "posts.create"        // AI studio
  | "content.manage"      // company content library (categories + ideas)
  | "audit.view";

const ROLE_PERMISSIONS: Record<RoleSlug, Permission[]> = {
  super_admin: ["companies.manage", "admins.manage", "catalog.manage", "content.manage", "audit.view"],
  company_admin: ["users.manage", "grants.manage", "posts.create", "content.manage", "audit.view"],
  user: ["posts.create"],
};

export function can(role: RoleSlug, perm: Permission): boolean {
  if (role === "super_admin") return true; // super admin has every permission
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

// Top-level sections each role may open (used by middleware + sidebar).
export const ROUTE_ACCESS: Record<string, RoleSlug[]> = {
  "/dashboard": ["super_admin", "company_admin", "user"],
  "/companies": ["super_admin"],
  "/admins": ["super_admin"],
  "/platforms": ["super_admin"],
  "/content-types": ["super_admin"],
  "/post-types": ["super_admin"],
  "/users": ["company_admin"],
  "/content-library": ["super_admin", "company_admin"],
  "/studio": ["company_admin", "user"],
  "/posts": ["company_admin", "user"],
};

export function canAccessPath(role: RoleSlug, pathname: string): boolean {
  if (role === "super_admin") return true; // super admin can open every page
  const seg = "/" + (pathname.split("/")[1] || "");
  const allowed = ROUTE_ACCESS[seg];
  if (!allowed) return true; // unlisted paths are not gated here
  return allowed.includes(role);
}
