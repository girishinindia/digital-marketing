import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

// Returns the platforms / post types / content types the current user may post with.
export const GET = handle(async () => {
  const user = await requireUser();
  const isAdmin = user.roleSlug !== "user";

  const postTypes = isAdmin
    ? await query<{ id: number; name: string; platformId: number; platformName: string }>(
        `SELECT pt.id, pt.name, pl.id AS "platformId", pl.name AS "platformName"
         FROM seo.post_types pt JOIN seo.platforms pl ON pl.id = pt.platform_id
         WHERE pt.is_active AND pl.is_active ORDER BY pl.name, pt.name`
      )
    : await query<{ id: number; name: string; platformId: number; platformName: string }>(
        `SELECT pt.id, pt.name, pl.id AS "platformId", pl.name AS "platformName"
         FROM seo.user_post_types upt
         JOIN seo.post_types pt ON pt.id = upt.post_type_id AND pt.is_active
         JOIN seo.platforms pl ON pl.id = pt.platform_id AND pl.is_active
         WHERE upt.user_id = $1 AND upt.is_active
         ORDER BY pl.name, pt.name`,
        [user.id]
      );

  const contentRows = isAdmin
    ? await query<{ postTypeId: number; id: number; name: string; slug: string }>(
        `SELECT ptct.post_type_id AS "postTypeId", ct.id, ct.name, ct.slug
         FROM seo.post_type_content_types ptct
         JOIN seo.content_types ct ON ct.id = ptct.content_type_id AND ct.is_active
         WHERE ptct.is_active ORDER BY ct.name`
      )
    : await query<{ postTypeId: number; id: number; name: string; slug: string }>(
        `SELECT upt.post_type_id AS "postTypeId", ct.id, ct.name, ct.slug
         FROM seo.user_post_type_content_types uptct
         JOIN seo.user_post_types upt ON upt.id = uptct.user_post_type_id AND upt.is_active
         JOIN seo.post_type_content_types ptct ON ptct.id = uptct.post_type_content_type_id
         JOIN seo.content_types ct ON ct.id = ptct.content_type_id AND ct.is_active
         WHERE upt.user_id = $1 AND uptct.is_active ORDER BY ct.name`,
        [user.id]
      );

  const contentTypesByPostType: Record<string, { id: number; name: string; slug: string }[]> = {};
  for (const r of contentRows) {
    (contentTypesByPostType[r.postTypeId] ??= []).push({ id: r.id, name: r.name, slug: r.slug });
  }

  const platformMap = new Map<number, string>();
  postTypes.forEach((p) => platformMap.set(p.platformId, p.platformName));
  const platforms = [...platformMap.entries()].map(([id, name]) => ({ id, name }));

  return ok({ platforms, postTypes, contentTypesByPostType });
});
