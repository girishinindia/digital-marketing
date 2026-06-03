import { handle, ok, getClientIp, ApiError } from "@/lib/api";
import { query, queryOne } from "@/lib/db";
import { requirePermission, requireCompanyId } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { generateSlot } from "@/lib/generate";
import { batchGenerateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_POSTS = 200; // safety cap per batch run

// Monday of the week containing dateStr (calendars are keyed by week_start = Monday).
function weekStartMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0 Sun .. 6 Sat
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().slice(0, 10);
}

// Create one post per eligible entity (employees + company account) for a given
// date, post type and optional content type(s). Idempotent: entities already
// generated for that exact slot are skipped so nothing extra is wasted.
export const POST = handle(async (req: Request) => {
  const actor = await requirePermission("calendar.manage");
  const input = batchGenerateSchema.parse(await req.json());
  const companyId = requireCompanyId(actor, input.companyId ?? null);

  // 1) Post type must be within the company's entitlement; platform is derived.
  const ent = await queryOne<{ platformId: number }>(
    `SELECT pt.platform_id AS "platformId"
     FROM seo.company_post_types cpt
     JOIN seo.post_types pt ON pt.id = cpt.post_type_id AND pt.is_active
     WHERE cpt.company_id = $1 AND cpt.post_type_id = $2 AND cpt.is_active`,
    [companyId, input.postTypeId]
  );
  if (!ent) throw new ApiError("This company isn't entitled to that post type", 403);
  const platformId = ent.platformId;

  // 2) Keep only entitled content types; empty selection → a single null slot.
  let contentTypeIds: (number | null)[] = [null];
  if (input.contentTypeIds.length) {
    const valid = await query<{ id: number }>(
      `SELECT DISTINCT ptct.content_type_id AS id
       FROM seo.company_post_type_content_types cptct
       JOIN seo.post_type_content_types ptct ON ptct.id = cptct.post_type_content_type_id
       WHERE cptct.company_id = $1 AND cptct.is_active
         AND ptct.post_type_id = $2 AND ptct.content_type_id = ANY($3::bigint[])`,
      [companyId, input.postTypeId, input.contentTypeIds]
    );
    contentTypeIds = valid.map((r) => Number(r.id));
    if (!contentTypeIds.length) throw new ApiError("None of the selected content types are entitled for this post type", 400);
  }

  // 3) Eligible entities: active members granted this post type, whose access
  //    window covers the batch date (company account included automatically).
  const entities = await query<{ id: number; name: string; isCompany: boolean }>(
    `SELECT u.id, u.name, u.is_company_account AS "isCompany"
     FROM seo.users u
     JOIN seo.user_post_types upt ON upt.user_id = u.id AND upt.post_type_id = $2 AND upt.is_active
     WHERE u.company_id = $1 AND u.is_active
       AND (u.active_from IS NULL OR $3::date >= u.active_from)
       AND (u.active_to   IS NULL OR $3::date <= u.active_to)
     ORDER BY u.is_company_account DESC, u.name`,
    [companyId, input.postTypeId, input.date]
  );
  if (!entities.length) throw new ApiError("No eligible members are granted this post type", 400);

  if (entities.length * contentTypeIds.length > MAX_POSTS)
    throw new ApiError(`That selection would create ${entities.length * contentTypeIds.length} posts (max ${MAX_POSTS}). Narrow the content types or split the run.`, 400);

  // 4) Find or create the weekly calendar for this date.
  const cal = await queryOne<{ id: number }>(
    `INSERT INTO seo.content_calendars (company_id, week_start, title, created_by)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (company_id, week_start) DO UPDATE SET company_id = EXCLUDED.company_id
     RETURNING id`,
    [companyId, weekStartMonday(input.date), `Week of ${weekStartMonday(input.date)}`, actor.id]
  );
  const calendarId = Number(cal!.id);

  // 5) For each entity × content type: dedupe, then generate.
  let created = 0, skipped = 0, failed = 0;
  const errors: { entity: string; error: string }[] = [];

  for (const e of entities) {
    for (const ctId of contentTypeIds) {
      try {
        let slot = await queryOne<{ id: number; postId: number | null; status: string }>(
          `SELECT id, post_id AS "postId", status FROM seo.calendar_slots
           WHERE calendar_id=$1 AND posting_user_id=$2 AND platform_id=$3 AND post_type_id=$4
             AND COALESCE(content_type_id,0)=COALESCE($5::bigint,0) AND slot_date=$6`,
          [calendarId, e.id, platformId, input.postTypeId, ctId, input.date]
        );

        // Already produced a post for this exact slot → don't regenerate (no waste).
        if (slot && slot.postId) { skipped++; continue; }

        if (!slot) {
          try {
            slot = await queryOne<{ id: number; postId: number | null; status: string }>(
              `INSERT INTO seo.calendar_slots
                 (calendar_id, company_id, posting_user_id, platform_id, post_type_id, content_type_id, slot_date, planned_time, status)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'planned')
               RETURNING id, post_id AS "postId", status`,
              [calendarId, companyId, e.id, platformId, input.postTypeId, ctId, input.date, input.plannedTime ?? null]
            );
          } catch (err) {
            // Unique guard (uq_slot_dedupe) — another run beat us; reuse it.
            if ((err as { code?: string }).code === "23505") {
              slot = await queryOne(
                `SELECT id, post_id AS "postId", status FROM seo.calendar_slots
                 WHERE calendar_id=$1 AND posting_user_id=$2 AND platform_id=$3 AND post_type_id=$4
                   AND COALESCE(content_type_id,0)=COALESCE($5::bigint,0) AND slot_date=$6`,
                [calendarId, e.id, platformId, input.postTypeId, ctId, input.date]
              );
              if (slot?.postId) { skipped++; continue; }
            } else throw err;
          }
        }

        await generateSlot(Number(slot!.id), { provider: input.provider });
        created++;
      } catch (err) {
        failed++;
        if (errors.length < 8) errors.push({ entity: e.name, error: (err as Error).message });
      }
    }
  }

  await writeAudit({
    actorUserId: actor.id, companyId, action: "batch.generate", entity: "calendar", entityId: calendarId,
    metadata: { date: input.date, postTypeId: input.postTypeId, contentTypes: contentTypeIds, created, skipped, failed }, ip: getClientIp(req),
  });

  return ok({
    calendarId, eligible: entities.length, contentTypes: contentTypeIds.length,
    planned: entities.length * contentTypeIds.length, created, skipped, failed, errors,
  });
});
