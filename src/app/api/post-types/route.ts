import { handle, ok, created, getClientIp } from "@/lib/api";
import { query } from "@/lib/db";
import { requireUser, requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { postTypeSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = handle(async (req: Request) => {
  await requireUser();
  const platformId = new URL(req.url).searchParams.get("platformId");
  const rows = await query(
    `SELECT pt.id, pt.platform_id AS "platformId", pl.name AS "platformName",
            pt.name, pt.slug, pt.is_active AS "isActive",
            (SELECT count(*) FROM seo.post_type_content_types m WHERE m.post_type_id = pt.id)::int AS "contentCount"
     FROM seo.post_types pt JOIN seo.platforms pl ON pl.id = pt.platform_id
     ${platformId ? "WHERE pt.platform_id = $1" : ""}
     ORDER BY pl.name, pt.name`,
    platformId ? [platformId] : []
  );
  return ok(rows);
});

export const POST = handle(async (req: Request) => {
  const actor = await requirePermission("catalog.manage");
  const input = postTypeSchema.parse(await req.json());
  const row = await query(
    `INSERT INTO seo.post_types (platform_id, name, slug, is_active)
     VALUES ($1,$2,$3,COALESCE($4,true))
     RETURNING id, platform_id AS "platformId", name, slug, is_active AS "isActive"`,
    [input.platformId, input.name, input.slug, input.isActive ?? null]
  );
  await writeAudit({ actorUserId: actor.id, action: "post_type.create", entity: "post_type", entityId: row[0].id, ip: getClientIp(req) });
  return created(row[0]);
});
