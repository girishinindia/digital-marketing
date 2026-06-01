import { handle, ok, noContent, buildUpdate, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { writeAudit } from "@/lib/audit";
import { userUpdateSchema } from "@/lib/validation";
import type { AuthUser } from "@/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// Company admin may only manage their own company's users; super admin may manage any.
// Returns the target user's company id (for auditing).
async function assertManageable(userId: string, actor: AuthUser): Promise<number | null> {
  const isSuper = actor.roleSlug === "super_admin";
  const row = await queryOne<{ companyId: number | null }>(
    `SELECT company_id AS "companyId" FROM seo.users
     WHERE id = $1 AND role_id = (SELECT id FROM seo.roles WHERE slug='user')
       ${isSuper ? "" : "AND company_id = $2"}`,
    isSuper ? [userId] : [userId, actor.companyId]
  );
  if (!row) throw new ApiError("User not found", 404);
  return row.companyId;
}

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("users.manage");
  const { id } = await ctx.params;
  const companyId = await assertManageable(id, actor);

  const input = userUpdateSchema.parse(await req.json());
  const cols: Record<string, unknown> = {
    name: input.name,
    phone: input.phone,
    is_active: input.isActive,
    active_from: input.activeFrom,
    active_to: input.activeTo,
  };
  if (input.password) cols.password_hash = await hashPassword(input.password);
  const { setSql, values } = buildUpdate(cols);
  if (!setSql) throw new ApiError("Nothing to update", 400);
  values.push(id);
  const row = await queryOne(
    `UPDATE seo.users SET ${setSql} WHERE id = $${values.length}
     RETURNING id, name, email, phone, is_active AS "isActive",
               active_from AS "activeFrom", active_to AS "activeTo"`,
    values
  );
  await writeAudit({ actorUserId: actor.id, companyId, action: "user.update", entity: "user", entityId: id, ip: getClientIp(req) });
  return ok(row);
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("users.manage");
  const { id } = await ctx.params;
  const companyId = await assertManageable(id, actor);
  await query(`DELETE FROM seo.users WHERE id = $1`, [id]);
  await writeAudit({ actorUserId: actor.id, companyId, action: "user.delete", entity: "user", entityId: id, ip: getClientIp(req) });
  return noContent();
});
