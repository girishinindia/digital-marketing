import { handle, ok, getClientIp, ApiError } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// A user confirms they posted it to their socials → Published + timestamp.
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("posts.view");
  const { id } = await ctx.params;
  const where = actor.roleSlug === "user" ? "id = $1 AND user_id = $2"
    : actor.roleSlug === "super_admin" ? "id = $1" : "id = $1 AND company_id = $2";
  const params: unknown[] = actor.roleSlug === "super_admin" ? [id] : [id, actor.roleSlug === "user" ? actor.id : actor.companyId];
  const row = await queryOne(
    `UPDATE seo.posts SET status = 'published', published_at = now() WHERE ${where} RETURNING id, status, published_at AS "publishedAt"`,
    params
  );
  if (!row) throw new ApiError("Post not found", 404);
  await writeAudit({ actorUserId: actor.id, companyId: actor.companyId, action: "post.mark_posted", entity: "post", entityId: id, ip: getClientIp(req) });
  return ok(row);
});
