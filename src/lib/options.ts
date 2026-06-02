import { query } from "./db";

export type StudioOptions = {
  platforms: { id: number; name: string }[];
  postTypes: { id: number; name: string; platformId: number; platformName: string }[];
  contentTypesByPostType: Record<string, { id: number; name: string; slug: string }[]>;
};

function group(
  postTypes: { id: number; name: string; platformId: number; platformName: string }[],
  contentRows: { postTypeId: number; id: number; name: string; slug: string }[]
): StudioOptions {
  const contentTypesByPostType: Record<string, { id: number; name: string; slug: string }[]> = {};
  for (const r of contentRows) (contentTypesByPostType[r.postTypeId] ??= []).push({ id: r.id, name: r.name, slug: r.slug });
  const pmap = new Map<number, string>();
  postTypes.forEach((p) => pmap.set(p.platformId, p.platformName));
  return { platforms: [...pmap.entries()].map(([id, name]) => ({ id, name })), postTypes, contentTypesByPostType };
}

// The full active catalog — used by admins composing freely in the Studio.
export async function getFullCatalogOptions(): Promise<StudioOptions> {
  const postTypes = await query<{ id: number; name: string; platformId: number; platformName: string }>(
    `SELECT pt.id, pt.name, pl.id AS "platformId", pl.name AS "platformName"
     FROM seo.post_types pt JOIN seo.platforms pl ON pl.id = pt.platform_id
     WHERE pt.is_active AND pl.is_active ORDER BY pl.name, pt.name`
  );
  const contentRows = await query<{ postTypeId: number; id: number; name: string; slug: string }>(
    `SELECT ptct.post_type_id AS "postTypeId", ct.id, ct.name, ct.slug
     FROM seo.post_type_content_types ptct
     JOIN seo.content_types ct ON ct.id = ptct.content_type_id AND ct.is_active
     WHERE ptct.is_active ORDER BY ct.name`
  );
  return group(postTypes, contentRows);
}

// Only what a specific posting entity (employee or company account) was granted.
export async function getGrantedOptions(userId: number): Promise<StudioOptions> {
  const postTypes = await query<{ id: number; name: string; platformId: number; platformName: string }>(
    `SELECT pt.id, pt.name, pl.id AS "platformId", pl.name AS "platformName"
     FROM seo.user_post_types upt
     JOIN seo.post_types pt ON pt.id = upt.post_type_id AND pt.is_active
     JOIN seo.platforms pl ON pl.id = pt.platform_id AND pl.is_active
     WHERE upt.user_id = $1 AND upt.is_active
     ORDER BY pl.name, pt.name`,
    [userId]
  );
  const contentRows = await query<{ postTypeId: number; id: number; name: string; slug: string }>(
    `SELECT upt.post_type_id AS "postTypeId", ct.id, ct.name, ct.slug
     FROM seo.user_post_type_content_types uptct
     JOIN seo.user_post_types upt ON upt.id = uptct.user_post_type_id AND upt.is_active
     JOIN seo.post_type_content_types ptct ON ptct.id = uptct.post_type_content_type_id
     JOIN seo.content_types ct ON ct.id = ptct.content_type_id AND ct.is_active
     WHERE upt.user_id = $1 AND uptct.is_active ORDER BY ct.name`,
    [userId]
  );
  return group(postTypes, contentRows);
}

// What a whole COMPANY is entitled to (Super Admin → Company). Admins compose within this.
export async function getEntitledOptions(companyId: number): Promise<StudioOptions> {
  const postTypes = await query<{ id: number; name: string; platformId: number; platformName: string }>(
    `SELECT pt.id, pt.name, pl.id AS "platformId", pl.name AS "platformName"
     FROM seo.company_post_types cpt
     JOIN seo.post_types pt ON pt.id = cpt.post_type_id AND pt.is_active
     JOIN seo.platforms pl ON pl.id = pt.platform_id AND pl.is_active
     WHERE cpt.company_id = $1 AND cpt.is_active
     ORDER BY pl.name, pt.name`,
    [companyId]
  );
  const contentRows = await query<{ postTypeId: number; id: number; name: string; slug: string }>(
    `SELECT ptct.post_type_id AS "postTypeId", ct.id, ct.name, ct.slug
     FROM seo.company_post_type_content_types cptct
     JOIN seo.post_type_content_types ptct ON ptct.id = cptct.post_type_content_type_id
     JOIN seo.content_types ct ON ct.id = ptct.content_type_id AND ct.is_active
     WHERE cptct.company_id = $1 AND cptct.is_active ORDER BY ct.name`,
    [companyId]
  );
  return group(postTypes, contentRows);
}
