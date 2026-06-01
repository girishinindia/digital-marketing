import { handle, ok, getClientIp, ApiError } from "@/lib/api";
import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth";
import { bunnyUpload } from "@/lib/bunny";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export const POST = handle(async (req: Request) => {
  const user = await requirePermission("posts.create");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError("No file provided", 400);
  if (file.size > MAX_BYTES) throw new ApiError("File too large (max 15MB)", 413);

  const buf = Buffer.from(await file.arrayBuffer());
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.companyId ?? "global"}/${user.id}/${Date.now()}-${safe}`;

  const { storagePath, cdnUrl } = await bunnyUpload(path, buf, file.type || "application/octet-stream");
  const rows = await query(
    `INSERT INTO seo.media_assets (company_id, user_id, storage_path, cdn_url, file_name, mime_type, size_bytes)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, cdn_url AS "cdnUrl", file_name AS "fileName", mime_type AS "mimeType", size_bytes AS "sizeBytes"`,
    [user.companyId ?? null, user.id, storagePath, cdnUrl, file.name, file.type || null, file.size]
  );
  await writeAudit({ actorUserId: user.id, companyId: user.companyId, action: "media.upload", entity: "media_asset", entityId: rows[0].id, ip: getClientIp(req) });
  return ok(rows[0]);
});
