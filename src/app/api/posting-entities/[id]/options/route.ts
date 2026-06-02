import { handle, ok, ApiError } from "@/lib/api";
import { queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { getGrantedOptions } from "@/lib/options";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// Granted platforms/post types/content types for one posting entity.
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const actor = await requirePermission("calendar.manage");
  const { id } = await ctx.params;
  const ent = await queryOne<{ companyId: number }>(
    `SELECT company_id AS "companyId" FROM seo.users WHERE id = $1`, [id]);
  if (!ent) throw new ApiError("Entity not found", 404);
  if (actor.roleSlug !== "super_admin" && ent.companyId !== actor.companyId) throw new ApiError("Forbidden", 403);
  return ok(await getGrantedOptions(Number(id)));
});
