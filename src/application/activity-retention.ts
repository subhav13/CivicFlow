import type { ActivityEntry } from './store';
import type { ChangedEntityKind, ChangedEntitySummary } from './command-types';

export const ACTIVITY_STORAGE_KEY = 'civicflow.activity.v1';
export const MAX_RETAINED_ACTIVITIES = 20;
export const MAX_RETAINED_BYTES = 32 * 1024;

const VALID_SOURCES: Record<string, true> = { human: true, webmcp: true };
const VALID_STATUSES: Record<string, true> = {
  succeeded: true,
  failed: true,
  undone: true,
};
const VALID_ENTITY_KINDS: Record<ChangedEntityKind, true> = {
  application: true,
  applicant: true,
  household_member: true,
  income_source: true,
  coverage_record: true,
  document: true,
  attestation: true,
  submission: true,
};

export function sanitizeActivityEntry(raw: unknown): ActivityEntry | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  if (
    typeof obj.id !== 'string' ||
    obj.id.trim() === '' ||
    obj.id.length > 128
  ) {
    return null;
  }
  if (
    typeof obj.summary !== 'string' ||
    obj.summary.trim() === '' ||
    obj.summary.length > 512
  ) {
    return null;
  }

  const sanitized: ActivityEntry = {
    id: obj.id,
    summary: obj.summary,
  };

  if (typeof obj.source === 'string' && VALID_SOURCES[obj.source]) {
    sanitized.source = obj.source as 'human' | 'webmcp';
  }

  if (typeof obj.status === 'string' && VALID_STATUSES[obj.status]) {
    sanitized.status = obj.status as 'succeeded' | 'failed' | 'undone';
  }

  if (typeof obj.section === 'string' && obj.section.length <= 32) {
    sanitized.section = obj.section as ActivityEntry['section'];
  }

  if (typeof obj.occurredAt === 'string' && obj.occurredAt.length <= 64) {
    sanitized.occurredAt = obj.occurredAt;
  }

  if (
    typeof obj.beforeRevision === 'number' &&
    Number.isFinite(obj.beforeRevision)
  ) {
    sanitized.beforeRevision = obj.beforeRevision;
  }

  if (
    typeof obj.afterRevision === 'number' &&
    Number.isFinite(obj.afterRevision)
  ) {
    sanitized.afterRevision = obj.afterRevision;
  }

  if (Array.isArray(obj.affectedEntities)) {
    const validEntities: ChangedEntitySummary[] = [];
    for (const item of obj.affectedEntities) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const ent = item as Record<string, unknown>;
        if (
          typeof ent.kind === 'string' &&
          VALID_ENTITY_KINDS[ent.kind as ChangedEntityKind] &&
          typeof ent.id === 'string' &&
          ent.id.length <= 128 &&
          typeof ent.label === 'string' &&
          ent.label.length <= 256
        ) {
          validEntities.push({
            kind: ent.kind as ChangedEntityKind,
            id: ent.id,
            label: ent.label,
          });
        }
      }
    }
    sanitized.affectedEntities = validEntities;
  }

  if (
    obj.recovery &&
    typeof obj.recovery === 'object' &&
    !Array.isArray(obj.recovery)
  ) {
    const rec = obj.recovery as Record<string, unknown>;
    if (typeof rec.section === 'string' && typeof rec.message === 'string') {
      sanitized.recovery = {
        section: rec.section,
        message: rec.message.slice(0, 512),
        ...(typeof rec.suggestedTool === 'string'
          ? { suggestedTool: rec.suggestedTool.slice(0, 64) }
          : {}),
        ...(Array.isArray(rec.requiredFields)
          ? {
              requiredFields: rec.requiredFields
                .filter((f): f is string => typeof f === 'string')
                .map((f) => f.slice(0, 64)),
            }
          : {}),
        ...(typeof rec.focusTargetId === 'string'
          ? { focusTargetId: rec.focusTargetId.slice(0, 64) }
          : {}),
      };
    }
  }

  return sanitized;
}

export function sanitizeActivityList(raw: unknown): readonly ActivityEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const result: ActivityEntry[] = [];
  for (const item of raw) {
    const sanitized = sanitizeActivityEntry(item);
    if (sanitized) {
      result.push(sanitized);
      if (result.length >= MAX_RETAINED_ACTIVITIES) {
        break;
      }
    }
  }
  return result;
}

function getUtf8ByteLength(str: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  return encodeURIComponent(str).replace(/%[A-F\d]{2}/g, 'U').length;
}

function resolveSessionStorage(storage?: Storage | null): Storage | null {
  if (storage === null) {
    return null;
  }
  if (storage !== undefined) {
    return storage;
  }
  try {
    if (
      typeof globalThis !== 'undefined' &&
      typeof globalThis.sessionStorage !== 'undefined' &&
      globalThis.sessionStorage !== null
    ) {
      return globalThis.sessionStorage;
    }
  } catch {
    // Storage access may be denied
  }
  return null;
}

export function loadRetainedActivity(
  storage?: Storage | null,
): readonly ActivityEntry[] {
  const store = resolveSessionStorage(storage);
  if (!store) return [];

  try {
    const raw = store.getItem(ACTIVITY_STORAGE_KEY);
    if (!raw) return [];
    if (getUtf8ByteLength(raw) > MAX_RETAINED_BYTES) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return sanitizeActivityList(parsed);
  } catch {
    return [];
  }
}

export function saveRetainedActivity(
  activity: readonly ActivityEntry[],
  storage?: Storage | null,
): void {
  const store = resolveSessionStorage(storage);
  if (!store) return;

  try {
    const sanitized = sanitizeActivityList(activity);
    const serialized = JSON.stringify(sanitized);
    if (getUtf8ByteLength(serialized) > MAX_RETAINED_BYTES) {
      return;
    }
    store.setItem(ACTIVITY_STORAGE_KEY, serialized);
  } catch {
    // Fail closed on quota or restricted storage
  }
}

export function clearRetainedActivity(storage?: Storage | null): void {
  const store = resolveSessionStorage(storage);
  if (!store) return;

  try {
    store.removeItem(ACTIVITY_STORAGE_KEY);
  } catch {
    // Ignore removal errors
  }
}
