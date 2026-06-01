import { handle, ok, created, getClientIp } from "@/lib/api";
import { query } from "@/lib/db";
import { requireUser, requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { contentTypeSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = handle(async () => {
  await requireUser();
  const rows = await query(
    `SELECT id, name, slug, is_active AS "isActive" FROM seo.content_types ORDER BY name`
  );
  return ok(rows);
});

export const POST = handle(async (req: Request) => {
  const actor = await requirePermission("catalog.manage");
  const input = contentTypeSchema.parse(await req.json());
  const row = await query(
    `INSERT INTO seo.content_types (name, slug, is_active) VALUES ($1,$2,COALESCE($3,true))
     RETURNING id, name, slug, is_active AS "isActive"`,
    [input.name, input.slug, input.isActive ?? null]
  );
  await writeAudit({ actorUserId: actor.id, action: "content_type.create", entity: "content_type", entityId: row[0].id, ip: getClientIp(req) });
  return created(row[0]);
});
