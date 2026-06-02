import { handle, ok, noContent, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne, tx } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { forgetSession } from "@/lib/redis";
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

// Permanently delete a company and everything under it.
// Every company_id FK is ON DELETE CASCADE, so deleting the company row removes
// its admins, users, company account, posts, content categories & ideas,
// calendars & slots, entitlements, user grants, media and refresh tokens.
// We additionally revoke the deleted users' Redis sessions and purge audit logs
// (audit_logs.company_id has no FK by design).
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const actor = await requirePermission("companies.manage");
  const { id } = await ctx.params;
  const company = await queryOne<{ name: string }>(`SELECT name FROM seo.companies WHERE id = $1`, [id]);
  if (!company) throw new ApiError("Company not found", 404);

  // Revoke active sessions for everyone in the company (their DB rows cascade below).
  const tokens = await query<{ jti: string }>(
    `SELECT rt.jti FROM seo.refresh_tokens rt JOIN seo.users u ON u.id = rt.user_id WHERE u.company_id = $1`,
    [id]
  );
  await Promise.all(tokens.map((t) => forgetSession(t.jti)));

  await tx(async (c) => {
    await c.query(`DELETE FROM seo.audit_logs WHERE company_id = $1`, [id]);
    await c.query(`DELETE FROM seo.companies WHERE id = $1`, [id]); // CASCADE removes the rest
  });

  await writeAudit({ actorUserId: actor.id, action: "company.delete", entity: "company", entityId: id, metadata: { name: company.name }, ip: getClientIp(req) });
  return noContent();
});
