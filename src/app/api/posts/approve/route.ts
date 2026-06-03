import { handle, ok, getClientIp, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

// Bulk approve generated posts.
export const POST = handle(async (req: Request) => {
  const actor = await requirePermission("posts.approve");
  const body = (await req.json()) as { ids?: number[] };
  const ids = (body.ids || []).map(Number).filter(Boolean);
  if (!ids.length) throw new ApiError("No posts selected", 400);
  const scope = actor.roleSlug === "super_admin" ? "" : "AND company_id = $2";
  const params: unknown[] = [ids];
  if (actor.roleSlug !== "super_admin") params.push(actor.companyId);
  const rows = await query<{ id: number }>(
    `UPDATE seo.posts SET status = 'approved' WHERE id = ANY($1::bigint[]) ${scope} RETURNING id`, params);
  await writeAudit({ actorUserId: actor.id, companyId: actor.companyId, action: "post.approve.bulk", entity: "post", metadata: { count: rows.length }, ip: getClientIp(req) });
  return ok({ approved: rows.length });
});
