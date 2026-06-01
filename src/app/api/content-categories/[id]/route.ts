import { handle, ok, noContent, buildUpdate, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { contentCategoryUpdateSchema } from "@/lib/validation";
import type { AuthUser } from "@/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// Company admin may only touch their own company's rows; super admin may touch any.
async function assertScope(id: string, user: AuthUser) {
  const row = await queryOne<{ companyId: number }>(
    `SELECT company_id AS "companyId" FROM seo.content_categories WHERE id = $1`, [id]);
  if (!row) throw new ApiError("Category not found", 404);
  if (user.roleSlug !== "super_admin" && row.companyId !== user.companyId) throw new ApiError("Forbidden", 403);
  return row.companyId;
}

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const user = await requirePermission("content.manage");
  const { id } = await ctx.params;
  const companyId = await assertScope(id, user);
  const input = contentCategoryUpdateSchema.parse(await req.json());
  const { setSql, values } = buildUpdate({
    name: input.name, slug: input.slug, description: input.description,
    sort_order: input.sortOrder, is_active: input.isActive,
  });
  if (!setSql) throw new ApiError("Nothing to update", 400);
  values.push(id);
  const row = await queryOne(
    `UPDATE seo.content_categories SET ${setSql} WHERE id = $${values.length}
     RETURNING id, name, slug, description, sort_order AS "sortOrder", is_active AS "isActive"`, values);
  await writeAudit({ actorUserId: user.id, companyId, action: "content_category.update", entity: "content_category", entityId: id, ip: getClientIp(req) });
  return ok(row);
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const user = await requirePermission("content.manage");
  const { id } = await ctx.params;
  const companyId = await assertScope(id, user);
  await query(`DELETE FROM seo.content_categories WHERE id = $1`, [id]);
  await writeAudit({ actorUserId: user.id, companyId, action: "content_category.delete", entity: "content_category", entityId: id, ip: getClientIp(req) });
  return noContent();
});
