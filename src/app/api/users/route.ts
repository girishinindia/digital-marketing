import { handle, ok, created, getClientIp, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { writeAudit } from "@/lib/audit";
import { userCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

// List users in the admin's own company (role = user).
export const GET = handle(async () => {
  const actor = await requirePermission("users.manage");
  if (!actor.companyId) throw new ApiError("Admin is not attached to a company", 400);
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.is_active AS "isActive",
            u.active_from AS "activeFrom", u.active_to AS "activeTo",
            u.last_login_at AS "lastLoginAt", u.created_at AS "createdAt",
            (u.is_active
              AND (u.active_from IS NULL OR CURRENT_DATE >= u.active_from)
              AND (u.active_to   IS NULL OR CURRENT_DATE <= u.active_to)) AS "effectivelyActive",
            (SELECT count(*) FROM seo.user_post_types g WHERE g.user_id = u.id AND g.is_active)::int AS "postTypeCount"
     FROM seo.users u
     JOIN seo.roles r ON r.id = u.role_id AND r.slug = 'user'
     WHERE u.company_id = $1
     ORDER BY u.created_at DESC`,
    [actor.companyId]
  );
  return ok(rows);
});

export const POST = handle(async (req: Request) => {
  const actor = await requirePermission("users.manage");
  if (!actor.companyId) throw new ApiError("Admin is not attached to a company", 400);
  const input = userCreateSchema.parse(await req.json());
  const hash = await hashPassword(input.password);
  const row = await query(
    `INSERT INTO seo.users (company_id, role_id, name, email, password_hash, phone, is_active, active_from, active_to, created_by)
     SELECT $1, r.id, $2, $3, $4, $5, COALESCE($6,true), $7, $8, $9
     FROM seo.roles r WHERE r.slug = 'user'
     RETURNING id, name, email, phone, is_active AS "isActive",
               active_from AS "activeFrom", active_to AS "activeTo"`,
    [actor.companyId, input.name, input.email, hash, input.phone ?? null,
     input.isActive ?? null, input.activeFrom ?? null, input.activeTo ?? null, actor.id]
  );
  await writeAudit({ actorUserId: actor.id, companyId: actor.companyId, action: "user.create", entity: "user", entityId: row[0].id, ip: getClientIp(req) });
  return created(row[0]);
});
