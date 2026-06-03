import { handle, ok, getClientIp, ApiError } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("posts.approve");
  const { id } = await ctx.params;
  const post = await queryOne<{ companyId: number }>(`SELECT company_id AS "companyId" FROM seo.posts WHERE id = $1`, [id]);
  if (!post) throw new ApiError("Post not found", 404);
  if (actor.roleSlug !== "super_admin" && String(post.companyId) !== String(actor.companyId)) throw new ApiError("Forbidden", 403);
  const row = await queryOne(`UPDATE seo.posts SET status = 'approved' WHERE id = $1 RETURNING id, status`, [id]);
  await writeAudit({ actorUserId: actor.id, companyId: post.companyId, action: "post.approve", entity: "post", entityId: id, ip: getClientIp(req) });
  return ok(row);
});
