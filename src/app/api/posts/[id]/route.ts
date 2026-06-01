import { handle, ok, noContent, buildUpdate, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { postUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

async function assertVisible(id: string, user: { id: number; roleSlug: string; companyId: number | null }) {
  // super admin → any post; company admin → own company; user → own posts
  if (user.roleSlug === "super_admin") {
    const row = await queryOne<{ id: number }>(`SELECT id FROM seo.posts WHERE id = $1`, [id]);
    if (!row) throw new ApiError("Post not found", 404);
    return;
  }
  const where = user.roleSlug === "user" ? "id = $1 AND user_id = $2" : "id = $1 AND company_id = $2";
  const val = user.roleSlug === "user" ? user.id : user.companyId;
  const row = await queryOne<{ id: number }>(`SELECT id FROM seo.posts WHERE ${where}`, [id, val]);
  if (!row) throw new ApiError("Post not found", 404);
}

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const user = await requirePermission("posts.create");
  const { id } = await ctx.params;
  await assertVisible(id, user);
  const input = postUpdateSchema.parse(await req.json());

  const cols: Record<string, unknown> = {
    title: input.title,
    body: input.body,
    hashtags: input.hashtags,
    media_url: input.mediaUrl,
    status: input.status,
    scheduled_at: input.scheduledAt,
  };
  if (input.status === "published") cols.published_at = new Date().toISOString();
  const { setSql, values } = buildUpdate(cols);
  if (!setSql) throw new ApiError("Nothing to update", 400);
  values.push(id);
  const row = await queryOne(
    `UPDATE seo.posts SET ${setSql} WHERE id = $${values.length}
     RETURNING id, title, body, hashtags, media_url AS "mediaUrl", status,
               scheduled_at AS "scheduledAt", published_at AS "publishedAt"`,
    values
  );
  await writeAudit({ actorUserId: user.id, companyId: user.companyId, action: "post.update", entity: "post", entityId: id, ip: getClientIp(req) });
  return ok(row);
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const user = await requirePermission("posts.create");
  const { id } = await ctx.params;
  await assertVisible(id, user);
  await query(`DELETE FROM seo.posts WHERE id = $1`, [id]);
  await writeAudit({ actorUserId: user.id, companyId: user.companyId, action: "post.delete", entity: "post", entityId: id, ip: getClientIp(req) });
  return noContent();
});
