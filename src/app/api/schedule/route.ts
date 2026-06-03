import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { requirePermission, requireCompanyId } from "@/lib/auth";

export const runtime = "nodejs";

// Read-only executor view: approved/scheduled/published posts in schedule order.
export const GET = handle(async (req: Request) => {
  const user = await requirePermission("posts.view");
  const sp = new URL(req.url).searchParams;
  const isUser = user.roleSlug === "user";
  const scope = isUser ? "p.user_id = $1" : "p.company_id = $1";
  const scopeVal = isUser ? user.id : requireCompanyId(user, sp.get("companyId") ? Number(sp.get("companyId")) : null);
  const rows = await query(
    `SELECT p.id, p.title, p.body, p.hashtags, p.media_url AS "mediaUrl", p.status,
            pl.name AS "platformName", pt.name AS "postTypeName", ct.name AS "contentTypeName",
            cd.title AS "ideaTitle", au.name AS "authorName",
            p.scheduled_at AS "scheduledAt", p.published_at AS "publishedAt"
     FROM seo.posts p
     JOIN seo.users au ON au.id = p.user_id
     JOIN seo.platforms pl ON pl.id = p.platform_id
     JOIN seo.post_types pt ON pt.id = p.post_type_id
     LEFT JOIN seo.content_types ct ON ct.id = p.content_type_id
     LEFT JOIN seo.content_details cd ON cd.id = p.content_detail_id
     WHERE ${scope} AND p.status IN ('approved','scheduled','published')
     ORDER BY COALESCE(p.scheduled_at, p.created_at), p.id`,
    [scopeVal]
  );
  return ok(rows);
});
