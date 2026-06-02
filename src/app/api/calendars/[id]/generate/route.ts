import { handle, ok, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { generateSlot } from "@/lib/generate";
import { slotGenerateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 120;
type Ctx = { params: Promise<{ id: string }> };

// Generate every still-planned slot in a calendar.
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("calendar.manage");
  const { id } = await ctx.params;
  const cal = await queryOne<{ companyId: number }>(`SELECT company_id AS "companyId" FROM seo.content_calendars WHERE id = $1`, [id]);
  if (!cal) throw new ApiError("Calendar not found", 404);
  if (actor.roleSlug !== "super_admin" && String(cal.companyId) !== String(actor.companyId)) throw new ApiError("Forbidden", 403);

  const body = slotGenerateSchema.parse(await req.json().catch(() => ({})));
  const planned = await query<{ id: number }>(`SELECT id FROM seo.calendar_slots WHERE calendar_id = $1 AND status = 'planned' ORDER BY slot_date`, [id]);

  let generated = 0;
  const errors: { slotId: number; error: string }[] = [];
  for (const s of planned) {
    try { await generateSlot(Number(s.id), { provider: body.provider }); generated++; }
    catch (e) { errors.push({ slotId: s.id, error: (e as Error).message }); }
  }
  await writeAudit({ actorUserId: actor.id, companyId: cal.companyId, action: "calendar.generate", entity: "calendar", entityId: id, metadata: { generated }, ip: getClientIp(req) });
  return ok({ total: planned.length, generated, failed: errors.length, errors: errors.slice(0, 5) });
});
