import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = handle(async () => {
  const user = await requirePermission("audit.view");
  const scoped = user.roleSlug === "company_admin";
  const rows = await query(
    `SELECT a.id, a.action, a.entity, a.entity_id AS "entityId", a.created_at AS "createdAt",
            u.name AS "actorName"
     FROM seo.audit_logs a LEFT JOIN seo.users u ON u.id = a.actor_user_id
     ${scoped ? "WHERE a.company_id = $1" : ""}
     ORDER BY a.created_at DESC LIMIT 50`,
    scoped ? [user.companyId] : []
  );
  return ok(rows);
});
