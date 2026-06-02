import { handle, ok, noContent, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import type { AuthUser } from "@/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

async function scope(id: string, actor: AuthUser): Promise<number> {
  const cal = await queryOne<{ companyId: number }>(`SELECT company_id AS "companyId" FROM seo.content_calendars WHERE id = $1`, [id]);
  if (!cal) throw new ApiError("Calendar not found", 404);
  if (actor.roleSlug !== "super_admin" && cal.companyId !== actor.companyId) throw new ApiError("Forbidden", 403);
  return cal.companyId;
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const actor = await requirePermission("calendar.manage");
  const { id } = await ctx.params;
  await scope(id, actor);
  const calendar = await queryOne(`SELECT id, week_start AS "weekStart", title, status FROM seo.content_calendars WHERE id = $1`, [id]);
  const slots = await query(
    `SELECT s.id, s.posting_user_id AS "postingUserId", u.name AS "entityName", u.is_company_account AS "isCompany",
            s.platform_id AS "platformId", pl.name AS "platformName",
            s.post_type_id AS "postTypeId", pt.name AS "postTypeName",
            s.content_type_id AS "contentTypeId", ct.name AS "contentTypeName",
            s.content_detail_id AS "contentDetailId", cd.title AS "ideaTitle",
            to_char(s.slot_date,'YYYY-MM-DD') AS "slotDate", to_char(s.planned_time,'HH24:MI') AS "plannedTime",
            s.notes, s.status, s.post_id AS "postId"
     FROM seo.calendar_slots s
     JOIN seo.users u ON u.id = s.posting_user_id
     JOIN seo.platforms pl ON pl.id = s.platform_id
     JOIN seo.post_types pt ON pt.id = s.post_type_id
     LEFT JOIN seo.content_types ct ON ct.id = s.content_type_id
     LEFT JOIN seo.content_details cd ON cd.id = s.content_detail_id
     WHERE s.calendar_id = $1
     ORDER BY u.is_company_account DESC, u.name, s.slot_date`,
    [id]
  );
  return ok({ calendar, slots });
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("calendar.manage");
  const { id } = await ctx.params;
  const companyId = await scope(id, actor);
  await query(`DELETE FROM seo.content_calendars WHERE id = $1`, [id]);
  await writeAudit({ actorUserId: actor.id, companyId, action: "calendar.delete", entity: "calendar", entityId: id, ip: getClientIp(req) });
  return noContent();
});
