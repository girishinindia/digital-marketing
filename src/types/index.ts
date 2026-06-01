export type RoleSlug = "super_admin" | "company_admin" | "user";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  roleSlug: RoleSlug;
  companyId: number | null;
}

export interface AccessClaims {
  sub: string;        // user id
  email: string;
  name: string;
  role: RoleSlug;
  companyId: number | null;
}

export interface RefreshClaims {
  sub: string;
  jti: string;
}
