import { handle, ok, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne, tx } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { grantSchema } from "@/lib/validation";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// Current entitlement — pre-fills the Super Admin editor.
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  await requirePermission("companies.manage");
  const { id } = await ctx.params;
  const pts = await query<{ postTypeId: number }>(
    `SELECT post_type_id AS "postTypeId" FROM seo.company_post_types WHERE company_id = $1 AND is_active`, [id]);
  const cts = await query<{ postTypeId: number; contentTypeId: number }>(
    `SELECT ptct.post_type_id AS "postTypeId", ptct.content_type_id AS "contentTypeId"
     FROM seo.company_post_type_content_types cptct
     JOIN seo.post_type_content_types ptct ON ptct.id = cptct.post_type_content_type_id
     WHERE cptct.company_id = $1 AND cptct.is_active`, [id]);
  const contentTypeIdsByPostType: Record<string, number[]> = {};
  for (const r of cts) (contentTypeIdsByPostType[r.postTypeId] ??= []).push(r.contentTypeId);
  return ok({ postTypeIds: pts.map((p) => p.postTypeId), contentTypeIdsByPostType });
});

// Replace a company's entitlement, then auto-revoke any user/company-account
// grant that now falls outside it (keeps the cascade consistent).
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("companies.manage");
  const { id } = await ctx.params;
  const companyId = Number(id);
  const exists = await queryOne(`SELECT id FROM seo.companies WHERE id = $1`, [companyId]);
  if (!exists) throw new ApiError("Company not found", 404);
  const input = grantSchema.parse(await req.json());

  await tx(async (c) => {
    if (input.postTypeIds.length) {
      await c.query(`DELETE FROM seo.company_post_types WHERE company_id = $1 AND NOT (post_type_id = ANY($2::smallint[]))`, [companyId, input.postTypeIds]);
    } else {
      await c.query(`DELETE FROM seo.company_post_types WHERE company_id = $1`, [companyId]);
    }
    for (const ptId of input.postTypeIds) {
      await c.query(
        `INSERT INTO seo.company_post_types (company_id, post_type_id, granted_by)
         VALUES ($1,$2,$3) ON CONFLICT (company_id, post_type_id) DO UPDATE SET is_active = true`,
        [companyId, ptId, actor.id]
      );
      const allowed = await c.query<{ id: number; contentTypeId: number }>(
        `SELECT id, content_type_id AS "contentTypeId" FROM seo.post_type_content_types WHERE post_type_id = $1 AND is_active`, [ptId]);
      const requested = input.contentTypeIdsByPostType?.[String(ptId)];
      const target = allowed.rows.filter((r) => !requested || requested.includes(r.contentTypeId)).map((r) => r.id);
      if (target.length) {
        await c.query(
          `DELETE FROM seo.company_post_type_content_types
           WHERE company_id = $1
             AND post_type_content_type_id IN (SELECT id FROM seo.post_type_content_types WHERE post_type_id = $2)
             AND NOT (post_type_content_type_id = ANY($3::bigint[]))`,
          [companyId, ptId, target]
        );
        for (const ptctId of target) {
          await c.query(`INSERT INTO seo.company_post_type_content_types (company_id, post_type_content_type_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [companyId, ptctId]);
        }
      } else {
        await c.query(`DELETE FROM seo.company_post_type_content_types WHERE company_id = $1 AND post_type_content_type_id IN (SELECT id FROM seo.post_type_content_types WHERE post_type_id = $2)`, [companyId, ptId]);
      }
    }
    // auto-revoke out-of-entitlement user grants
    await c.query(
      `DELETE FROM seo.user_post_types upt USING seo.users u
       WHERE upt.user_id = u.id AND u.company_id = $1
         AND upt.post_type_id NOT IN (SELECT post_type_id FROM seo.company_post_types WHERE company_id = $1 AND is_active)`,
      [companyId]
    );
    await c.query(
      `DELETE FROM seo.user_post_type_content_types uptct
       USING seo.user_post_types upt, seo.users u
       WHERE uptct.user_post_type_id = upt.id AND upt.user_id = u.id AND u.company_id = $1
         AND uptct.post_type_content_type_id NOT IN (SELECT post_type_content_type_id FROM seo.company_post_type_content_types WHERE company_id = $1 AND is_active)`,
      [companyId]
    );
  });

  await writeAudit({ actorUserId: actor.id, companyId, action: "entitlement.replace", entity: "company", entityId: id, metadata: { postTypes: input.postTypeIds.length }, ip: getClientIp(req) });
  return ok({ ok: true });
});
