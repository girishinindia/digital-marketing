import { handle, ok, noContent, buildUpdate, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { slotUpdateSchema } from "@/lib/validation";
import type { AuthUser } from "@/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

async function scope(id: string, actor: AuthUser): Promise<number> {
  const row = await queryOne<{ companyId: number }>(`SELECT company_id AS "companyId" FROM seo.calendar_slots WHERE id = $1`, [id]);
  if (!row) throw new ApiError("Slot not found", 404);
  if (actor.roleSlug !== "super_admin" && String(row.companyId) !== String(actor.companyId)) throw new ApiError("Forbidden", 403);
  return row.companyId;
}

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("calendar.manage");
  const { id } = await ctx.params;
  const companyId = await scope(id, actor);
  const input = slotUpdateSchema.parse(await req.json());
  const { setSql, values } = buildUpdate({
    platform_id: input.platformId, post_type_id: input.postTypeId, content_type_id: input.contentTypeId,
    content_detail_id: input.contentDetailId, slot_date: input.slotDate, planned_time: input.plannedTime,
    notes: input.notes, status: input.status,
  });
  if (!setSql) throw new ApiError("Nothing to update", 400);
  values.push(id);
  const row = await queryOne(`UPDATE seo.calendar_slots SET ${setSql} WHERE id = $${values.length} RETURNING id, status`, values);
  await writeAudit({ actorUserId: actor.id, companyId, action: "slot.update", entity: "calendar_slot", entityId: id, ip: getClientIp(req) });
  return ok(row);
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("calendar.manage");
  const { id } = await ctx.params;
  const companyId = await scope(id, actor);
  await query(`DELETE FROM seo.calendar_slots WHERE id = $1`, [id]);
  await writeAudit({ actorUserId: actor.id, companyId, action: "slot.delete", entity: "calendar_slot", entityId: id, ip: getClientIp(req) });
  return noContent();
});
