import { handle, ok } from "@/lib/api";
import { query } from "@/lib/db";
import { requirePermission, requireCompanyId } from "@/lib/auth";

export const runtime = "nodejs";

// Posting entities for a company: the company account (pinned first) + employees.
export const GET = handle(async (req: Request) => {
  const actor = await requirePermission("calendar.manage");
  const qp = new URL(req.url).searchParams.get("companyId");
  const companyId = requireCompanyId(actor, qp ? Number(qp) : null);
  const rows = await query(
    `SELECT u.id, u.name, u.is_company_account AS "isCompany",
            (SELECT count(*) FROM seo.user_post_types g WHERE g.user_id = u.id AND g.is_active)::int AS "postTypeCount"
     FROM seo.users u
     JOIN seo.roles r ON r.id = u.role_id AND r.slug = 'user'
     WHERE u.company_id = $1
     ORDER BY u.is_company_account DESC, u.name`,
    [companyId]
  );
  return ok(rows);
});
