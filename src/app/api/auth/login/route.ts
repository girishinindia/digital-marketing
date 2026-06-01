import { handle, ok, fail, getClientIp } from "@/lib/api";
import { queryOne, query } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/redis";
import { writeAudit } from "@/lib/audit";
import { loginSchema } from "@/lib/validation";
import type { RoleSlug } from "@/types";

export const runtime = "nodejs";

function activeForToday(from: Date | string | null, to: Date | string | null): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toDay = (v: Date | string) => {
    const d = new Date(v);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };
  if (from && today < toDay(from)) return false;
  if (to && today > toDay(to)) return false;
  return true;
}

export const POST = handle(async (req: Request) => {
  const ip = getClientIp(req);
  if (!(await rateLimit(`login:${ip}`, 10, 60))) {
    return fail("Too many attempts. Please wait a minute.", 429);
  }

  const body = loginSchema.parse(await req.json());

  if (!(await verifyRecaptcha(body.recaptchaToken))) {
    return fail("reCAPTCHA verification failed", 400);
  }

  const row = await queryOne<{
    id: number;
    email: string;
    name: string;
    passwordHash: string | null;
    isActive: boolean;
    activeFrom: Date | null;
    activeTo: Date | null;
    companyId: number | null;
    roleSlug: RoleSlug;
  }>(
    `SELECT u.id, u.email, u.name, u.password_hash AS "passwordHash",
            u.is_active AS "isActive", u.active_from AS "activeFrom", u.active_to AS "activeTo",
            u.company_id AS "companyId", r.slug AS "roleSlug"
     FROM seo.users u JOIN seo.roles r ON r.id = u.role_id
     WHERE lower(u.email) = lower($1)`,
    [body.email]
  );

  if (!row || !row.passwordHash || !(await verifyPassword(body.password, row.passwordHash))) {
    return fail("Invalid email or password", 401);
  }
  if (!row.isActive) {
    return fail("Your account has been deactivated. Contact your administrator.", 403);
  }
  if (!activeForToday(row.activeFrom, row.activeTo)) {
    return fail("Your access is not active for today's date. Contact your administrator.", 403);
  }

  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    roleSlug: row.roleSlug,
    companyId: row.companyId,
  };
  await createSession(user, { ip, userAgent: req.headers.get("user-agent") ?? undefined });
  await query(`UPDATE seo.users SET last_login_at = now() WHERE id = $1`, [user.id]);
  await writeAudit({ actorUserId: user.id, companyId: user.companyId, action: "auth.login", entity: "user", entityId: user.id, ip });

  return ok({ user });
});
