import { handle, ok, noContent, buildUpdate, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { contentTypeSchema } from "@/lib/validation";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("catalog.manage");
  const { id } = await ctx.params;
  const input = contentTypeSchema.partial().parse(await req.json());
  const { setSql, values } = buildUpdate({ name: input.name, slug: input.slug, is_active: input.isActive });
  if (!setSql) throw new ApiError("Nothing to update", 400);
  values.push(id);
  const row = await queryOne(
    `UPDATE seo.content_types SET ${setSql} WHERE id = $${values.length}
     RETURNING id, name, slug, is_active AS "isActive"`, values);
  if (!row) throw new ApiError("Content type not found", 404);
  await writeAudit({ actorUserId: actor.id, action: "content_type.update", entity: "content_type", entityId: id, ip: getClientIp(req) });
  return ok(row);
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("catalog.manage");
  const { id } = await ctx.params;
  await query(`DELETE FROM seo.content_types WHERE id = $1`, [id]);
  await writeAudit({ actorUserId: actor.id, action: "content_type.delete", entity: "content_type", entityId: id, ip: getClientIp(req) });
  return noContent();
});
