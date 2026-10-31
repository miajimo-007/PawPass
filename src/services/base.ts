import { db } from '@/db/database';
import type { AuditAction, BaseEntity } from '@/db/types';
import { nowIso, uuid } from '@/lib/utils';

/** Adds id + timestamps to a new entity. */
export function stamp<T extends object>(data: T, opts: { isDemo?: boolean; id?: string } = {}): T & BaseEntity {
  const now = nowIso();
  return {
    ...data,
    id: opts.id ?? uuid(),
    createdAt: now,
    updatedAt: now,
    ...(opts.isDemo ? { isDemo: true } : {}),
  };
}

/** Removes keys whose value is undefined or empty string so stored rows stay clean. */
export function clean<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === '') continue;
    out[k] = v;
  }
  return out as T;
}

export async function audit(action: AuditAction, entity: string, summary: string, entityId?: string, catId?: string) {
  await db.auditEvents.add({ id: uuid(), at: nowIso(), action, entity, entityId, catId, summary });
}
