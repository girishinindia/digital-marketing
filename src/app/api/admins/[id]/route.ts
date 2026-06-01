import { handle, ok, noContent, buildUpdate, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { writeAudit } from "@/lib/audit";
import { userUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("admins.manage");
  const { id } = await ctx.params;
  const input = userUpdateSchema.parse(await req.json());
  const cols: Record<string, unknown> = {
    name: input.name,
    phone: input.phone,
    is_active: input.isActive,
  };
  if (input.password) cols.password_hash = await hashPassword(input.password);
  const { setSql, values } = buildUpdate(cols);
  if (!setSql) throw new ApiError("Nothing to update", 400);
  values.push(id);
  const row = await queryOne(
    `UPDATE seo.users SET ${setSql} WHERE id = $${values.length}
     AND role_id = (SELECT id FROM seo.roles WHERE slug='company_admin')
     RETURNING id, name, email, phone, is_active AS "isActive"`,
    values
  );
  if (!row) throw new ApiError("Admin not found", 404);
  await writeAudit({ actorUserId: actor.id, action: "admin.update", entity: "user", entityId: id, ip: getClientIp(req) });
  return ok(row);
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("admins.manage");
  const { id } = await ctx.params;
  await query(`DELETE FROM seo.users WHERE id = $1 AND role_id = (SELECT id FROM seo.roles WHERE slug='company_admin')`, [id]);
  await writeAudit({ actorUserId: actor.id, action: "admin.delete", entity: "user", entityId: id, ip: getClientIp(req) });
  return noContent();
});
