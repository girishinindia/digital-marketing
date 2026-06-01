import { handle, ok, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne, tx } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { grantSchema } from "@/lib/validation";
import type { AuthUser } from "@/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// Company admin → own company; super admin → any company.
async function assertManageable(userId: string, actor: AuthUser) {
  const isSuper = actor.roleSlug === "super_admin";
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM seo.users WHERE id = $1 AND role_id = (SELECT id FROM seo.roles WHERE slug='user')
       ${isSuper ? "" : "AND company_id = $2"}`,
    isSuper ? [userId] : [userId, actor.companyId]
  );
  if (!row) throw new ApiError("User not found", 404);
}

// Current grants — used to pre-fill the editor.
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const actor = await requirePermission("grants.manage");
  const { id } = await ctx.params;
  await assertManageable(id, actor);

  const pts = await query<{ postTypeId: number }>(
    `SELECT post_type_id AS "postTypeId" FROM seo.user_post_types WHERE user_id = $1 AND is_active`,
    [id]
  );
  const cts = await query<{ postTypeId: number; contentTypeId: number }>(
    `SELECT upt.post_type_id AS "postTypeId", ptct.content_type_id AS "contentTypeId"
     FROM seo.user_post_type_content_types uptct
     JOIN seo.user_post_types upt ON upt.id = uptct.user_post_type_id
     JOIN seo.post_type_content_types ptct ON ptct.id = uptct.post_type_content_type_id
     WHERE upt.user_id = $1 AND uptct.is_active`,
    [id]
  );
  const contentTypeIdsByPostType: Record<string, number[]> = {};
  for (const r of cts) {
    (contentTypeIdsByPostType[r.postTypeId] ??= []).push(r.contentTypeId);
  }
  return ok({ postTypeIds: pts.map((p) => p.postTypeId), contentTypeIdsByPostType });
});

// Replace the full grant set for a user.
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("grants.manage");
  const { id } = await ctx.params;
  await assertManageable(id, actor);
  const input = grantSchema.parse(await req.json());
  const userId = Number(id);

  await tx(async (c) => {
    // 1. Drop post types no longer granted.
    if (input.postTypeIds.length) {
      await c.query(
        `DELETE FROM seo.user_post_types WHERE user_id = $1 AND NOT (post_type_id = ANY($2::smallint[]))`,
        [userId, input.postTypeIds]
      );
    } else {
      await c.query(`DELETE FROM seo.user_post_types WHERE user_id = $1`, [userId]);
    }

    // 2. Upsert each granted post type, then sync its content types.
    for (const ptId of input.postTypeIds) {
      const upt = await c.query(
        `INSERT INTO seo.user_post_types (user_id, post_type_id, granted_by)
         VALUES ($1,$2,$3)
         ON CONFLICT (user_id, post_type_id) DO UPDATE SET is_active = true
         RETURNING id`,
        [userId, ptId, actor.id]
      );
      const uptId = upt.rows[0].id;

      const allowed = await c.query<{ id: number; contentTypeId: number }>(
        `SELECT id, content_type_id AS "contentTypeId"
         FROM seo.post_type_content_types WHERE post_type_id = $1 AND is_active`,
        [ptId]
      );
      const requested = input.contentTypeIdsByPostType?.[String(ptId)];
      const targetPtct = allowed.rows
        .filter((r) => !requested || requested.includes(r.contentTypeId))
        .map((r) => r.id);

      // remove content grants no longer wanted
      if (targetPtct.length) {
        await c.query(
          `DELETE FROM seo.user_post_type_content_types
           WHERE user_post_type_id = $1 AND NOT (post_type_content_type_id = ANY($2::bigint[]))`,
          [uptId, targetPtct]
        );
        for (const ptctId of targetPtct) {
          await c.query(
            `INSERT INTO seo.user_post_type_content_types (user_post_type_id, post_type_content_type_id)
             VALUES ($1,$2) ON CONFLICT (user_post_type_id, post_type_content_type_id) DO UPDATE SET is_active = true`,
            [uptId, ptctId]
          );
        }
      } else {
        await c.query(`DELETE FROM seo.user_post_type_content_types WHERE user_post_type_id = $1`, [uptId]);
      }
    }
  });

  await writeAudit({
    actorUserId: actor.id,
    companyId: actor.companyId,
    action: "grants.replace",
    entity: "user",
    entityId: id,
    metadata: { postTypes: input.postTypeIds.length },
    ip: getClientIp(req),
  });
  return ok({ ok: true });
});
