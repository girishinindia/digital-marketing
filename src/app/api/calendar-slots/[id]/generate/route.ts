import { handle, ok, getClientIp, ApiError } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { generateSlot } from "@/lib/generate";
import { slotGenerateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;
type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("calendar.manage");
  const { id } = await ctx.params;
  const row = await queryOne<{ companyId: number }>(`SELECT company_id AS "companyId" FROM seo.calendar_slots WHERE id = $1`, [id]);
  if (!row) throw new ApiError("Slot not found", 404);
  if (actor.roleSlug !== "super_admin" && String(row.companyId) !== String(actor.companyId)) throw new ApiError("Forbidden", 403);
  const body = slotGenerateSchema.parse(await req.json().catch(() => ({})));
  const post = await generateSlot(Number(id), { provider: body.provider, prompt: body.prompt });
  await writeAudit({ actorUserId: actor.id, companyId: row.companyId, action: "slot.generate", entity: "calendar_slot", entityId: id, ip: getClientIp(req) });
  return ok({ post });
});
