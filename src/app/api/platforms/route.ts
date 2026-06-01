import { handle, ok, created, getClientIp } from "@/lib/api";
import { query } from "@/lib/db";
import { requireUser, requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { platformSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = handle(async () => {
  await requireUser();
  const rows = await query(
    `SELECT p.id, p.name, p.slug, p.icon_url AS "iconUrl", p.is_active AS "isActive",
            (SELECT count(*) FROM seo.post_types pt WHERE pt.platform_id = p.id)::int AS "postTypeCount"
     FROM seo.platforms p ORDER BY p.name`
  );
  return ok(rows);
});

export const POST = handle(async (req: Request) => {
  const actor = await requirePermission("catalog.manage");
  const input = platformSchema.parse(await req.json());
  const row = await query(
    `INSERT INTO seo.platforms (name, slug, icon_url, is_active)
     VALUES ($1,$2,$3,COALESCE($4,true))
     RETURNING id, name, slug, icon_url AS "iconUrl", is_active AS "isActive"`,
    [input.name, input.slug, input.iconUrl || null, input.isActive ?? null]
  );
  await writeAudit({ actorUserId: actor.id, action: "platform.create", entity: "platform", entityId: row[0].id, ip: getClientIp(req) });
  return created(row[0]);
});
