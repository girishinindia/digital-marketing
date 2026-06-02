import { handle, created, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { slotCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const POST = handle(async (req: Request) => {
  const actor = await requirePermission("calendar.manage");
  const input = slotCreateSchema.parse(await req.json());

  const cal = await queryOne<{ companyId: number }>(`SELECT company_id AS "companyId" FROM seo.content_calendars WHERE id = $1`, [input.calendarId]);
  if (!cal) throw new ApiError("Calendar not found", 404);
  if (actor.roleSlug !== "super_admin" && cal.companyId !== actor.companyId) throw new ApiError("Forbidden", 403);

  const ent = await queryOne<{ companyId: number }>(`SELECT company_id AS "companyId" FROM seo.users WHERE id = $1`, [input.postingUserId]);
  if (!ent || ent.companyId !== cal.companyId) throw new ApiError("Entity is not in this company", 400);

  const grant = await queryOne(`SELECT id FROM seo.user_post_types WHERE user_id = $1 AND post_type_id = $2 AND is_active`, [input.postingUserId, input.postTypeId]);
  if (!grant) throw new ApiError("This entity isn't granted that post type", 403);

  const rows = await query(
    `INSERT INTO seo.calendar_slots (calendar_id, company_id, posting_user_id, platform_id, post_type_id,
                                     content_type_id, content_detail_id, slot_date, planned_time, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id, status`,
    [input.calendarId, cal.companyId, input.postingUserId, input.platformId, input.postTypeId,
     input.contentTypeId ?? null, input.contentDetailId ?? null, input.slotDate, input.plannedTime ?? null, input.notes ?? null]
  );
  await writeAudit({ actorUserId: actor.id, companyId: cal.companyId, action: "slot.create", entity: "calendar_slot", entityId: rows[0].id, ip: getClientIp(req) });
  return created(rows[0]);
});
