import { handle, ok } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = handle(async () => {
  const user = await requireUser();

  if (user.roleSlug === "super_admin") {
    const stats = await queryOne(
      `SELECT
        (SELECT count(*) FROM seo.companies)::int AS companies,
        (SELECT count(*) FROM seo.companies WHERE is_active)::int AS "activeCompanies",
        (SELECT count(*) FROM seo.users u JOIN seo.roles r ON r.id=u.role_id WHERE r.slug='company_admin')::int AS admins,
        (SELECT count(*) FROM seo.users u JOIN seo.roles r ON r.id=u.role_id WHERE r.slug='user')::int AS users,
        (SELECT count(*) FROM seo.platforms)::int AS platforms,
        (SELECT count(*) FROM seo.post_types)::int AS "postTypes",
        (SELECT count(*) FROM seo.content_types)::int AS "contentTypes",
        (SELECT count(*) FROM seo.posts)::int AS posts`
    );
    const recent = await query(
      `SELECT c.id, c.name, c.slug, c.is_active AS "isActive",
              (SELECT count(*) FROM seo.users u WHERE u.company_id=c.id)::int AS "userCount"
       FROM seo.companies c ORDER BY c.created_at DESC LIMIT 5`
    );
    return ok({ role: user.roleSlug, stats, recent });
  }

  if (user.roleSlug === "company_admin") {
    const stats = await queryOne(
      `SELECT
        (SELECT count(*) FROM seo.users WHERE company_id=$1 AND role_id=(SELECT id FROM seo.roles WHERE slug='user'))::int AS users,
        (SELECT count(*) FROM seo.users u WHERE u.company_id=$1 AND u.role_id=(SELECT id FROM seo.roles WHERE slug='user')
            AND u.is_active AND (u.active_from IS NULL OR CURRENT_DATE>=u.active_from) AND (u.active_to IS NULL OR CURRENT_DATE<=u.active_to))::int AS "activeUsers",
        (SELECT count(*) FROM seo.posts WHERE company_id=$1)::int AS posts,
        (SELECT count(*) FROM seo.posts WHERE company_id=$1 AND status IN ('scheduled','published'))::int AS "publishedOrScheduled"`,
      [user.companyId]
    );
    const recent = await query(
      `SELECT u.id, u.name, u.email, u.is_active AS "isActive",
              (u.is_active AND (u.active_from IS NULL OR CURRENT_DATE>=u.active_from) AND (u.active_to IS NULL OR CURRENT_DATE<=u.active_to)) AS "effectivelyActive"
       FROM seo.users u WHERE u.company_id=$1 AND u.role_id=(SELECT id FROM seo.roles WHERE slug='user')
       ORDER BY u.created_at DESC LIMIT 5`,
      [user.companyId]
    );
    return ok({ role: user.roleSlug, stats, recent });
  }

  // role: user
  const stats = await queryOne(
    `SELECT
      (SELECT count(*) FROM seo.posts WHERE user_id=$1)::int AS posts,
      (SELECT count(*) FROM seo.posts WHERE user_id=$1 AND status='draft')::int AS drafts,
      (SELECT count(*) FROM seo.posts WHERE user_id=$1 AND status IN ('scheduled','published'))::int AS "publishedOrScheduled",
      (SELECT count(*) FROM seo.user_post_types WHERE user_id=$1 AND is_active)::int AS "grantedPostTypes"`,
    [user.id]
  );
  const recent = await query(
    `SELECT p.id, p.title, p.body, p.status, pl.name AS "platformName", pt.name AS "postTypeName", p.created_at AS "createdAt"
     FROM seo.posts p JOIN seo.platforms pl ON pl.id=p.platform_id JOIN seo.post_types pt ON pt.id=p.post_type_id
     WHERE p.user_id=$1 ORDER BY p.created_at DESC LIMIT 5`,
    [user.id]
  );
  return ok({ role: user.roleSlug, stats, recent });
});
