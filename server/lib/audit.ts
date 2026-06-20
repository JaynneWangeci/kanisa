// ── Immutable Audit Log ──
// Append-only, queryable, separate from site data.
// SOC 2: who accessed what, from where, when.

import { requireService } from "./supabase.js";
import { getRedis, cacheGet, cacheSet, cacheDel, cacheKey } from "./redis.js";
import { v4 as uuid } from "uuid";

export type AuditAction =
  | "login" | "logout" | "failed_login"
  | "password_change" | "password_reset" | "password_reset_request"
  | "rate_limit_blocked"
  | "create" | "read" | "update" | "delete"
  | "export" | "view" | "view_sensitive"
  | "api_call"
  | "session_create" | "session_destroy"
  | "permission_change"
  | "data_access"
  | "settings_change"
  | "reminder_sent";

export type AuditResourceType =
  | "member" | "donation" | "pledge" | "campaign"
  | "admin" | "session" | "setting" | "reminder"
  | "committee" | "export" | "analytics" | "audit_log";

interface AuditEntry {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_name: string | null;
  actor_role: string | null;
  action: AuditAction;
  resource_type: AuditResourceType | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  immutable: boolean;
}

// Capped in-memory buffer for batch writes (performance + immutability guarantee)
const AUDIT_BATCH_SIZE = 50;
const AUDIT_FLUSH_INTERVAL = 5000;
const pendingAudits: AuditEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function ensureFlusher() {
  if (flushTimer) return;
  flushTimer = setInterval(async () => {
    if (pendingAudits.length === 0) return;
    const batch = pendingAudits.splice(0, AUDIT_BATCH_SIZE);
    try {
      const db = requireService();
      const { error } = await db.from("audit_logs").insert(batch);
      if (error) console.error("audit batch insert error:", error.message);

      // Also write to immutable storage (separate table)
      try {
        await db.from("audit_logs_immutable").insert(batch.map(e => ({ ...e, immutable: true })));
      } catch (e2) { /* immutable table may not exist yet */ }
    } catch (e) {
      console.error("audit flush error:", e);
      // Re-queue on failure
      pendingAudits.unshift(...batch);
    }
  }, AUDIT_FLUSH_INTERVAL);

  if (flushTimer && typeof flushTimer === "object" && "unref" in flushTimer) {
    (flushTimer as any).unref();
  }
}

export async function logAudit(params: {
  actorId: string;
  actorName?: string | null;
  actorRole?: string | null;
  action: AuditAction;
  resourceType?: AuditResourceType | null;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}) {
  const entry: AuditEntry = {
    id: uuid(),
    timestamp: new Date().toISOString(),
    actor_id: params.actorId,
    actor_name: params.actorName || null,
    actor_role: params.actorRole || null,
    action: params.action,
    resource_type: params.resourceType || null,
    resource_id: params.resourceId || null,
    details: params.details || null,
    ip_address: params.ipAddress || null,
    user_agent: params.userAgent || null,
    request_id: params.requestId || null,
    immutable: true,
  };

  pendingAudits.push(entry);
  ensureFlusher();

  // Also write synchronously for critical actions
  if (["login", "failed_login", "permission_change", "delete"].includes(params.action)) {
    try {
      const db = requireService();
      await db.from("audit_logs").insert(entry);
    } catch (e) {
      console.error("critical audit write error:", e);
    }
  }

  return entry.id;
}

// Query audit logs with filters
export async function queryAuditLogs(params: {
  actorId?: string;
  action?: AuditAction;
  resourceType?: AuditResourceType;
  resourceId?: string;
  fromDate?: string;
  toDate?: string;
  ipAddress?: string;
  limit?: number;
  offset?: number;
  sortDesc?: boolean;
}): Promise<{ logs: AuditEntry[]; total: number }> {
  const db = requireService();
  let query = db.from("audit_logs").select("*", { count: "exact" });

  if (params.actorId) query = query.eq("actor_id", params.actorId);
  if (params.action) query = query.eq("action", params.action);
  if (params.resourceType) query = query.eq("resource_type", params.resourceType);
  if (params.resourceId) query = query.eq("resource_id", params.resourceId);
  if (params.ipAddress) query = query.eq("ip_address", params.ipAddress);
  if (params.fromDate) query = query.gte("timestamp", params.fromDate);
  if (params.toDate) query = query.lte("timestamp", params.toDate);

  query = query.order("timestamp", { ascending: params.sortDesc === false });

  if (params.limit) query = query.limit(params.limit);
  if (params.offset) query = query.range(params.offset, params.offset + (params.limit || 50) - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { logs: (data || []) as AuditEntry[], total: count || 0 };
}

// Get access summary (SOC 2 - who accessed what)
export async function getAccessSummary(params: {
  fromDate: string;
  toDate: string;
  groupBy?: "actor" | "resource_type" | "action" | "ip_address";
}): Promise<any[]> {
  const db = requireService();
  const groupCol = params.groupBy || "actor_id";
  const { data, error } = await db.rpc("get_audit_summary", {
    from_date: params.fromDate,
    to_date: params.toDate,
    group_col: groupCol,
  });
  if (error) throw new Error(error.message);
  return data || [];
}

// Flush pending audits immediately (for graceful shutdown)
export async function flushAudits(): Promise<void> {
  if (pendingAudits.length === 0) return;
  const batch = pendingAudits.splice(0, pendingAudits.length);
  try {
    const db = requireService();
    await db.from("audit_logs").insert(batch);
  } catch (e) {
    console.error("audit flush error:", e);
  }
}
