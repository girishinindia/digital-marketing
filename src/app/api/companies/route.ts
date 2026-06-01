import { handle, ok, created, getClientIp } from "@/lib/api";
import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { companyCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = handle(async () => {
  await requirePermission("companies.manage");
  const rows = await query(
    `SELECT c.id, c.name, c.slug, c.legal_name AS "legalName", c.website,
            c.logo_url AS "logoUrl", c.is_active AS "isActive", c.created_at AS "createdAt",
            (SELECT count(*) FROM seo.users u WHERE u.company_id = c.id)::int AS "userCount"
     FROM seo.companies c
     ORDER BY c.created_at DESC`
  );
  return ok(rows);
});

export const POST = handle(async (req: Request) => {
  const actor = await requirePermission("companies.manage");
  const input = companyCreateSchema.parse(await req.json());
  const row = await query(
    `INSERT INTO seo.companies (name, slug, legal_name, website, is_active)
     VALUES ($1,$2,$3,$4,COALESCE($5, true))
     RETURNING id, name, slug, legal_name AS "legalName", website, is_active AS "isActive"`,
    [input.name, input.slug, input.legalName ?? null, input.website || null, input.isActive ?? null]
  );
  await writeAudit({
    actorUserId: actor.id,
    action: "company.create",
    entity: "company",
    entityId: row[0].id,
    metadata: { name: input.name },
    ip: getClientIp(req),
  });
  return created(row[0]);
});
