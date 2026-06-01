import { handle, ok, noContent, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { companyUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("companies.manage");
  const { id } = await ctx.params;
  const input = companyUpdateSchema.parse(await req.json());

  const sets: string[] = [];
  const vals: unknown[] = [];
  const add = (col: string, val: unknown) => {
    sets.push(`${col} = $${sets.length + 1}`);
    vals.push(val);
  };
  if (input.name !== undefined) add("name", input.name);
  if (input.slug !== undefined) add("slug", input.slug);
  if (input.legalName !== undefined) add("legal_name", input.legalName);
  if (input.website !== undefined) add("website", input.website || null);
  if (input.isActive !== undefined) add("is_active", input.isActive);
  if (!sets.length) throw new ApiError("Nothing to update", 400);

  vals.push(id);
  const row = await queryOne(
    `UPDATE seo.companies SET ${sets.join(", ")} WHERE id = $${vals.length}
     RETURNING id, name, slug, legal_name AS "legalName", website, is_active AS "isActive"`,
    vals
  );
  if (!row) throw new ApiError("Company not found", 404);
  await writeAudit({ actorUserId: actor.id, action: "company.update", entity: "company", entityId: id, ip: getClientIp(req) });
  return ok(row);
});

export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("companies.manage");
  const { id } = await ctx.params;
  await query(`DELETE FROM seo.companies WHERE id = $1`, [id]);
  await writeAudit({ actorUserId: actor.id, action: "company.delete", entity: "company", entityId: id, ip: getClientIp(req) });
  return noContent();
});
