import { handle, ok, created, getClientIp, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { requireUser, requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { contentCategorySchema } from "@/lib/validation";
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
  const qp = new URL(req.url).searchParams.get("companyId");
  const companyId = resolveCompanyId(user, qp ? Number(qp) : null);
  const rows = await query(
    `SELECT cc.id, cc.name, cc.slug, cc.description, cc.sort_order AS "sortOrder", cc.is_active AS "isActive",
            (SELECT count(*) FROM seo.content_details d WHERE d.category_id = cc.id)::int AS "ideaCount"
     FROM seo.content_categories cc
     WHERE cc.company_id = $1
     ORDER BY cc.sort_order, cc.name`,
    [companyId]
  );
  return ok(rows);
});

export const POST = handle(async (req: Request) => {
  const user = await requirePermission("content.manage");
  const input = contentCategorySchema.parse(await req.json());
  const companyId = resolveCompanyId(user, input.companyId ?? null);
  const row = await query(
    `INSERT INTO seo.content_categories (company_id, name, slug, description, sort_order, is_active)
     VALUES ($1,$2,$3,$4,COALESCE($5,0),COALESCE($6,true))
     RETURNING id, name, slug, description, sort_order AS "sortOrder", is_active AS "isActive"`,
    [companyId, input.name, input.slug, input.description ?? null, input.sortOrder ?? null, input.isActive ?? null]
  );
  await writeAudit({ actorUserId: user.id, companyId, action: "content_category.create", entity: "content_category", entityId: row[0].id, ip: getClientIp(req) });
  return created(row[0]);
});
