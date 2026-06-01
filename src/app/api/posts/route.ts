import { handle, ok, created, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission, requireCompanyId } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = handle(async (req: Request) => {
  const user = await requirePermission("posts.create");
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const isUser = user.roleSlug === "user";
  const scope = isUser ? "p.user_id = $1" : "p.company_id = $1";
  const scopeVal = isUser ? user.id : requireCompanyId(user, sp.get("companyId") ? Number(sp.get("companyId")) : null);
  const params: unknown[] = [scopeVal];
  let statusSql = "";
  if (status) {
    params.push(status);
    statusSql = `AND p.status = $${params.length}`;
  }
  const rows = await query(
    `SELECT p.id, p.title, p.body, p.hashtags, p.media_url AS "mediaUrl", p.status,
            pl.name AS "platformName", pt.name AS "postTypeName", ct.name AS "contentTypeName",
            cc.name AS "contentCategoryName", cd.title AS "contentIdeaTitle",
            p.ai_provider AS "aiProvider", p.ai_model AS "aiModel",
            p.scheduled_at AS "scheduledAt", p.published_at AS "publishedAt", p.created_at AS "createdAt",
            au.name AS "authorName"
     FROM seo.posts p
     JOIN seo.users au ON au.id = p.user_id
     JOIN seo.platforms pl ON pl.id = p.platform_id
     JOIN seo.post_types pt ON pt.id = p.post_type_id
     LEFT JOIN seo.content_types ct ON ct.id = p.content_type_id
     LEFT JOIN seo.content_categories cc ON cc.id = p.content_category_id
     LEFT JOIN seo.content_details cd ON cd.id = p.content_detail_id
     WHERE ${scope} ${statusSql}
     ORDER BY p.created_at DESC LIMIT 200`,
    params
  );
  return ok(rows);
});

export const POST = handle(async (req: Request) => {
  const user = await requirePermission("posts.create");
  const b = (await req.json()) as {
    platformId: number; postTypeId: number; contentTypeId?: number; title?: string; body?: string; prompt?: string;
    contentCategoryId?: number; contentDetailId?: number; companyId?: number;
  };
  if (!b.platformId || !b.postTypeId) throw new ApiError("platformId and postTypeId are required", 400);
  const companyId = requireCompanyId(user, b.companyId ?? null);

  if (user.roleSlug === "user") {
    const grant = await queryOne(`SELECT id FROM seo.user_post_types WHERE user_id=$1 AND post_type_id=$2 AND is_active`, [user.id, b.postTypeId]);
    if (!grant) throw new ApiError("You don't have access to this post type", 403);
  }

  const rows = await query(
    `INSERT INTO seo.posts (company_id, user_id, platform_id, post_type_id, content_type_id, title, body, prompt, status,
                            content_category_id, content_detail_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9,$10)
     RETURNING id, title, body, status, created_at AS "createdAt"`,
    [companyId, user.id, b.platformId, b.postTypeId, b.contentTypeId ?? null, b.title ?? null, b.body ?? null, b.prompt ?? null,
     b.contentCategoryId ?? null, b.contentDetailId ?? null]
  );
  await writeAudit({ actorUserId: user.id, companyId, action: "post.create", entity: "post", entityId: rows[0].id, ip: getClientIp(req) });
  return created(rows[0]);
});
