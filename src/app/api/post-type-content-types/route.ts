import { handle, ok, created, noContent, getClientIp, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { requireUser, requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { mappingSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = handle(async (req: Request) => {
  await requireUser();
  const sp = new URL(req.url).searchParams;
  const postTypeId = sp.get("postTypeId");
  const companyId = sp.get("companyId");
  if (!postTypeId) throw new ApiError("postTypeId is required", 400);
  // When a company is given, restrict to that company's entitled content formats.
  const params: unknown[] = [postTypeId];
  let entSql = "";
  if (companyId) {
    params.push(companyId);
    entSql = `AND m.id IN (SELECT post_type_content_type_id FROM seo.company_post_type_content_types WHERE company_id = $2 AND is_active)`;
  }
  const rows = await query(
    `SELECT m.id, m.post_type_id AS "postTypeId", m.content_type_id AS "contentTypeId",
            ct.name AS "contentTypeName", ct.slug AS "contentTypeSlug", m.is_active AS "isActive"
     FROM seo.post_type_content_types m
     JOIN seo.content_types ct ON ct.id = m.content_type_id
     WHERE m.post_type_id = $1 ${entSql} ORDER BY ct.name`,
    params
  );
  return ok(rows);
});

export const POST = handle(async (req: Request) => {
  const actor = await requirePermission("catalog.manage");
  const input = mappingSchema.parse(await req.json());
  const row = await query(
    `INSERT INTO seo.post_type_content_types (post_type_id, content_type_id)
     VALUES ($1,$2)
     ON CONFLICT (post_type_id, content_type_id) DO UPDATE SET is_active = true
     RETURNING id, post_type_id AS "postTypeId", content_type_id AS "contentTypeId"`,
    [input.postTypeId, input.contentTypeId]
  );
  await writeAudit({ actorUserId: actor.id, action: "mapping.create", entity: "post_type_content_type", entityId: row[0].id, ip: getClientIp(req) });
  return created(row[0]);
});

export const DELETE = handle(async (req: Request) => {
  const actor = await requirePermission("catalog.manage");
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new ApiError("id is required", 400);
  await query(`DELETE FROM seo.post_type_content_types WHERE id = $1`, [id]);
  await writeAudit({ actorUserId: actor.id, action: "mapping.delete", entity: "post_type_content_type", entityId: id, ip: getClientIp(req) });
  return noContent();
});
