import { handle, ok, created, getClientIp } from "@/lib/api";
import { query } from "@/lib/db";
import { requirePermission, requireCompanyId } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { calendarCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = handle(async (req: Request) => {
  const actor = await requirePermission("calendar.manage");
  const sp = new URL(req.url).searchParams;
  const companyId = requireCompanyId(actor, sp.get("companyId") ? Number(sp.get("companyId")) : null);
  const rows = await query(
    `SELECT c.id, c.week_start AS "weekStart", c.title, c.status, c.created_at AS "createdAt",
            (SELECT count(*) FROM seo.calendar_slots s WHERE s.calendar_id = c.id)::int AS "slotCount",
            (SELECT count(*) FROM seo.calendar_slots s WHERE s.calendar_id = c.id AND s.status <> 'planned')::int AS "generatedCount"
     FROM seo.content_calendars c WHERE c.company_id = $1 ORDER BY c.week_start DESC`,
    [companyId]
  );
  return ok(rows);
});

export const POST = handle(async (req: Request) => {
  const actor = await requirePermission("calendar.manage");
  const input = calendarCreateSchema.parse(await req.json());
  const companyId = requireCompanyId(actor, input.companyId ?? null);
  const rows = await query(
    `INSERT INTO seo.content_calendars (company_id, week_start, title, created_by)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (company_id, week_start) DO UPDATE SET title = COALESCE(EXCLUDED.title, seo.content_calendars.title)
     RETURNING id, week_start AS "weekStart", title, status`,
    [companyId, input.weekStart, input.title ?? null, actor.id]
  );
  await writeAudit({ actorUserId: actor.id, companyId, action: "calendar.create", entity: "calendar", entityId: rows[0].id, ip: getClientIp(req) });
  return created(rows[0]);
});
