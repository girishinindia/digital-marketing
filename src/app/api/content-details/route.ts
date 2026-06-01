import { handle, ok, created, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireUser, requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { contentDetailSchema } from "@/lib/validation";
import type { AuthUser } from "@/types";

export const runtime = "nodejs";

function resolveCompanyId(user: AuthUser, provided?: number | null): number {
  if (user.roleSlug === "super_admin") {
    if (!provided) throw new ApiError("companyId is required", 400);
    return provided;
  }
  if (!user.companyId) throw new ApiError("No company context", 400);
  return user.companyId;
}

export const GET = handle(async (req: Request) => {
  const user = await requireUser();
  const sp = new URL(req.url).searchParams;
  const companyId = resolveCompanyId(user, sp.get("companyId") ? Number(sp.get("companyId")) : null);
  const categoryId = sp.get("categoryId");
  const params: unknown[] = [companyId];
  let catSql = "";
  if (categoryId) { params.push(categoryId); catSql = `AND d.category_id = $${params.length}`; }
  const rows = await query(
    `SELECT d.id, d.category_id AS "categoryId", cc.name AS "categoryName",
            d.title, d.slug, d.description, d.default_prompt AS "defaultPrompt",
            d.suggested_content_type_id AS "suggestedContentTypeId", ct.name AS "suggestedFormatName",
            d.sort_order AS "sortOrder", d.is_active AS "isActive"
     FROM seo.content_details d
     JOIN seo.content_categories cc ON cc.id = d.category_id
     LEFT JOIN seo.content_types ct ON ct.id = d.suggested_content_type_id
     WHERE d.company_id = $1 ${catSql}
     ORDER BY cc.sort_order, d.sort_order, d.title`,
    params
  );
  return ok(rows);
});

export const POST = handle(async (req: Request) => {
  const user = await requirePermission("content.manage");
  const input = contentDetailSchema.parse(await req.json());
  const companyId = resolveCompanyId(user, input.companyId ?? null);
  // category must belong to the same company
  const cat = await queryOne<{ id: number }>(
    `SELECT id FROM seo.content_categories WHERE id = $1 AND company_id = $2`, [input.categoryId, companyId]);
  if (!cat) throw new ApiError("Category not found in this company", 404);
  const row = await query(
    `INSERT INTO seo.content_details (company_id, category_id, title, slug, description, suggested_content_type_id, default_prompt, sort_order, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,0),COALESCE($9,true))
     RETURNING id, category_id AS "categoryId", title, slug, description, default_prompt AS "defaultPrompt",
               suggested_content_type_id AS "suggestedContentTypeId", is_active AS "isActive"`,
    [companyId, input.categoryId, input.title, input.slug, input.description ?? null,
     input.suggestedContentTypeId ?? null, input.defaultPrompt ?? null, input.sortOrder ?? null, input.isActive ?? null]
  );
  await writeAudit({ actorUserId: user.id, companyId, action: "content_detail.create", entity: "content_detail", entityId: row[0].id, ip: getClientIp(req) });
  return created(row[0]);
});
