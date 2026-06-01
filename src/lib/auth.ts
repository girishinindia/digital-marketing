import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { query, queryOne } from "./db";
import { signAccess, signRefresh, verifyAccess, verifyRefresh } from "./jwt";
import { rememberSession, sessionExists, forgetSession } from "./redis";
import { ApiError } from "./api";
import { env } from "./env";
import type { AuthUser, AccessClaims, RoleSlug } from "@/types";
import { can, type Permission } from "./rbac";

const ACCESS = "dm_access";
const REFRESH = "dm_refresh";

function ttlToSeconds(ttl: string, fallback: number): number {
  const m = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!m) return fallback;
  const n = Number(m[1]);
  return n * ({ s: 1, m: 60, h: 3600, d: 86400 }[m[2]] as number);
}
const ACCESS_SECONDS = ttlToSeconds(env.jwt.accessTtl, 900);
const REFRESH_SECONDS = ttlToSeconds(env.jwt.refreshTtl, 604800);

function cookieOpts(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: env.app.isProd, path: "/", maxAge };
}

function claimsToUser(c: AccessClaims): AuthUser {
  return {
    id: Number(c.sub),
    email: c.email,
    name: c.name,
    roleSlug: c.role,
    companyId: c.companyId ?? null,
  };
}

// Issue access + refresh cookies, remember the session, persist the refresh row.
export async function createSession(user: AuthUser, meta?: { ip?: string; userAgent?: string }) {
  const store = await cookies();
  const access = await signAccess({
    sub: String(user.id),
    email: user.email,
    name: user.name,
    role: user.roleSlug,
    companyId: user.companyId,
  });
  const jti = randomUUID();
  const refresh = await signRefresh({ sub: String(user.id), jti });

  await rememberSession(jti, user.id, REFRESH_SECONDS);
  const expiresAt = new Date(Date.now() + REFRESH_SECONDS * 1000).toISOString();
  await query(
    `INSERT INTO seo.refresh_tokens (user_id, jti, user_agent, ip, expires_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [user.id, jti, meta?.userAgent ?? null, meta?.ip ?? null, expiresAt]
  );

  store.set(ACCESS, access, cookieOpts(ACCESS_SECONDS));
  store.set(REFRESH, refresh, cookieOpts(REFRESH_SECONDS));
}

export async function destroySession() {
  const store = await cookies();
  const rt = store.get(REFRESH)?.value;
  if (rt) {
    const claims = await verifyRefresh(rt);
    if (claims?.jti) {
      await forgetSession(claims.jti);
      await query(`UPDATE seo.refresh_tokens SET revoked_at = now() WHERE jti = $1`, [claims.jti]);
    }
  }
  store.delete(ACCESS);
  store.delete(REFRESH);
}

// Rotate an access token from a valid, non-revoked refresh token.
export async function refreshSession(): Promise<AuthUser | null> {
  const store = await cookies();
  const rt = store.get(REFRESH)?.value;
  if (!rt) return null;
  const claims = await verifyRefresh(rt);
  if (!claims) return null;
  if (!(await sessionExists(claims.jti))) return null;

  const user = await loadUserById(Number(claims.sub));
  if (!user) return null;

  const access = await signAccess({
    sub: String(user.id),
    email: user.email,
    name: user.name,
    role: user.roleSlug,
    companyId: user.companyId,
  });
  store.set(ACCESS, access, cookieOpts(ACCESS_SECONDS));
  return user;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(ACCESS)?.value;
  if (!token) return null;
  const claims = await verifyAccess(token);
  if (!claims) return null;
  return claimsToUser(claims);
}

// For route handlers: throws 401/403 as ApiError.
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("Not authenticated", 401);
  return user;
}
export async function requireRole(...roles: RoleSlug[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!roles.includes(user.roleSlug)) throw new ApiError("Forbidden", 403);
  return user;
}
export async function requirePermission(perm: Permission): Promise<AuthUser> {
  const user = await requireUser();
  if (!can(user.roleSlug, perm)) throw new ApiError("Forbidden", 403);
  return user;
}

// Load a fresh AuthUser straight from the DB (role + company joined).
export async function loadUserById(id: number): Promise<AuthUser | null> {
  return queryOne<AuthUser>(
    `SELECT u.id, u.email, u.name, r.slug AS "roleSlug", u.company_id AS "companyId"
     FROM seo.users u JOIN seo.roles r ON r.id = u.role_id
     WHERE u.id = $1`,
    [id]
  );
}
