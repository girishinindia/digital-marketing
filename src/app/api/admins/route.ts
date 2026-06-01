import { handle, ok, created, getClientIp } from "@/lib/api";
import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { writeAudit } from "@/lib/audit";
import { adminCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export const GET = handle(async () => {
  await requirePermission("admins.manage");
  const rows = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.is_active AS "isActive",
            u.company_id AS "companyId", c.name AS "companyName",
            u.last_login_at AS "lastLoginAt", u.created_at AS "createdAt"
     FROM seo.users u
     JOIN seo.roles r ON r.id = u.role_id AND r.slug = 'company_admin'
     LEFT JOIN seo.companies c ON c.id = u.company_id
     ORDER BY u.created_at DESC`
  );
  return ok(rows);
});

export const POST = handle(async (req: Request) => {
  const actor = await requirePermission("admins.manage");
  const input = adminCreateSchema.parse(await req.json());
  const hash = await hashPassword(input.password);
  const row = await query(
    `INSERT INTO seo.users (company_id, role_id, name, email, password_hash, phone, created_by)
     SELECT $1, r.id, $2, $3, $4, $5, $6 FROM seo.roles r WHERE r.slug = 'company_admin'
     RETURNING id, name, email, phone, company_id AS "companyId", is_active AS "isActive"`,
    [input.companyId, input.name, input.email, hash, input.phone ?? null, actor.id]
  );
  await writeAudit({ actorUserId: actor.id, companyId: input.companyId, action: "admin.create", entity: "user", entityId: row[0].id, ip: getClientIp(req) });
  return created(row[0]);
});
