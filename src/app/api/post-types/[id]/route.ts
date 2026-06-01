import { handle, ok, noContent, buildUpdate, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { postTypeSchema } from "@/lib/validation";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("catalog.manage");
  const { id } = await ctx.params;
  const input = postTypeSchema.partial().parse(await req.json());
  const { setSql, values } = buildUpdate({
    platform_id: input.platformId, name: input.name, slug: input.slug, is_active: input.isActive,
  });
  if (!setSql) throw new ApiError("Nothing to update", 400);
  values.push(id);
  const row = await queryOne(
    `UPDATE seo.post_types SET ${setSql} WHERE id = $${values.length}
     RETURNING id, platform_id AS "platformId", name, slug, is_active AS "isActive"`, values);
  if (!row) throw new ApiError("Post type not found", 404);
  await writeAudit({ actorUserId: actor.id, action: "post_type.update", entity: "post_type", entityId: id, ip: getClientIp(req) });
  return ok(row);
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("catalog.manage");
  const { id } = await ctx.params;
  await query(`DELETE FROM seo.post_types WHERE id = $1`, [id]);
  await writeAudit({ actorUserId: actor.id, action: "post_type.delete", entity: "post_type", entityId: id, ip: getClientIp(req) });
  return noContent();
});
