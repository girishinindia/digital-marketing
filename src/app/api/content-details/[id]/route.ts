import { handle, ok, noContent, buildUpdate, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { contentDetailUpdateSchema } from "@/lib/validation";
import type { AuthUser } from "@/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

async function assertScope(id: string, user: AuthUser) {
  const row = await queryOne<{ companyId: number }>(
    `SELECT company_id AS "companyId" FROM seo.content_details WHERE id = $1`, [id]);
  if (!row) throw new ApiError("Idea not found", 404);
  if (user.roleSlug !== "super_admin" && String(row.companyId) !== String(user.companyId)) throw new ApiError("Forbidden", 403);
  return row.companyId;
}

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const user = await requirePermission("content.manage");
  const { id } = await ctx.params;
  const companyId = await assertScope(id, user);
  const input = contentDetailUpdateSchema.parse(await req.json());
  const { setSql, values } = buildUpdate({
    category_id: input.categoryId, title: input.title, slug: input.slug, description: input.description,
    suggested_content_type_id: input.suggestedContentTypeId, default_prompt: input.defaultPrompt,
    sort_order: input.sortOrder, is_active: input.isActive,
  });
  if (!setSql) throw new ApiError("Nothing to update", 400);
  values.push(id);
  const row = await queryOne(
    `UPDATE seo.content_details SET ${setSql} WHERE id = $${values.length}
     RETURNING id, category_id AS "categoryId", title, slug, description, default_prompt AS "defaultPrompt",
               suggested_content_type_id AS "suggestedContentTypeId", is_active AS "isActive"`, values);
  await writeAudit({ actorUserId: user.id, companyId, action: "content_detail.update", entity: "content_detail", entityId: id, ip: getClientIp(req) });
  return ok(row);
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const user = await requirePermission("content.manage");
  const { id } = await ctx.params;
  const companyId = await assertScope(id, user);
  await query(`DELETE FROM seo.content_details WHERE id = $1`, [id]);
  await writeAudit({ actorUserId: user.id, companyId, action: "content_detail.delete", entity: "content_detail", entityId: id, ip: getClientIp(req) });
  return noContent();
});
