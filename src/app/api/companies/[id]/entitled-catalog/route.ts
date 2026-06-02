import { handle, ok, ApiError } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { getEntitledOptions } from "@/lib/options";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

// The post types a company is entitled to — the catalog the grant editor shows.
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const actor = await requirePermission("grants.manage");
  const { id } = await ctx.params;
  if (actor.roleSlug !== "super_admin" && Number(id) !== actor.companyId) throw new ApiError("Forbidden", 403);
  const opts = await getEntitledOptions(Number(id));
  return ok(opts.postTypes);
});
