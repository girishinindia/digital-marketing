import { query } from "./db";

export async function writeAudit(entry: {
  actorUserId?: number | null;
  companyId?: number | null;
  action: string;
  entity?: string;
  entityId?: string | number;
  metadata?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO seo.audit_logs (actor_user_id, company_id, action, entity, entity_id, metadata, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        entry.actorUserId ?? null,
        entry.companyId ?? null,
        entry.action,
        entry.entity ?? null,
        entry.entityId != null ? String(entry.entityId) : null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.ip ?? null,
      ]
    );
  } catch (e) {
    console.error("[audit] failed to write:", e);
  }
}
