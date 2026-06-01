import { handle, ok, noContent, buildUpdate, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { writeAudit } from "@/lib/audit";
import { userUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// Confirm the target user belongs to the admin's company.
async function assertOwned(userId: string, companyId: number) {
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM seo.users WHERE id = $1 AND company_id = $2
       AND role_id = (SELECT id FROM seo.roles WHERE slug='user')`,
    [userId, companyId]
  );
  if (!row) throw new ApiError("User not found in your company", 404);
}

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("users.manage");
  if (!actor.companyId) throw new ApiError("Admin is not attached to a company", 400);
  const { id } = await ctx.params;
  await assertOwned(id, actor.companyId);

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
  await writeAudit({ actorUserId: actor.id, companyId: actor.companyId, action: "user.update", entity: "user", entityId: id, ip: getClientIp(req) });
  return ok(row);
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("users.manage");
  if (!actor.companyId) throw new ApiError("Admin is not attached to a company", 400);
  const { id } = await ctx.params;
  await assertOwned(id, actor.companyId);
  await query(`DELETE FROM seo.users WHERE id = $1`, [id]);
  await writeAudit({ actorUserId: actor.id, companyId: actor.companyId, action: "user.delete", entity: "user", entityId: id, ip: getClientIp(req) });
  return noContent();
});
