import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { requireService } from "./supabase.js";
import { logAudit as logAuditV2 } from "./audit.js";
import { hasPermission, DataType, Action } from "./permissions.js";
import { cacheGet, cacheSet, cacheKey } from "./redis.js";
import { v4 as uuid } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES = "24h";

// API rate limiting (per-IP)
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 300;
const reqCounts = new Map<string, { count: number; resetAt: number }>();

export { hasPermission } from "./permissions.js";
export { requirePermission } from "./permissions.js";
export { DataType, Action } from "./permissions.js";
export type { AuditAction, AuditResourceType } from "./audit.js";

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: { id: string; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
}

// ----- IP & Context ----- //

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip?.replace(/^::ffff:/, "") || req.socket.remoteAddress?.replace(/^::ffff:/, "") || "unknown";
}

function getUserAgent(req: Request): string | null {
  return (req.headers["user-agent"] || "").slice(0, 512) || null;
}

export async function setAdminContext(adminId: string, role: string) {
  try {
    const db = requireService();
    await db.rpc("set_admin_context", { admin_id: adminId, role });
  } catch {
    // non-critical: RLS context is fallback
  }
}

// ----- Legacy In-Memory Cache (deprecated, kept for backward compat) ----- //

interface CacheEntry { data: any; expiresAt: number; }
const memCache = new Map<string, CacheEntry>();
const MEM_CACHE_TTL = 30 * 1000;

export function getCached(key: string): any | null {
  const entry = memCache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  memCache.delete(key);
  return null;
}

export function setCache(key: string, data: any, ttl = MEM_CACHE_TTL) {
  memCache.set(key, { data, expiresAt: Date.now() + ttl });
  if (memCache.size > 100) {
    const first = memCache.keys().next().value;
    if (first) memCache.delete(first);
  }
}

// ----- API Rate Limiting ----- //

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const now = Date.now();
  let entry = reqCounts.get(ip);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    reqCounts.set(ip, entry);
  }

  entry.count++;
  res.setHeader("X-RateLimit-Limit", RATE_LIMIT_MAX.toString());
  res.setHeader("X-RateLimit-Remaining", Math.max(0, RATE_LIMIT_MAX - entry.count).toString());

  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }

  next();
}

// ----- Session Management ----- //

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(adminId: string, token: string, ipAddress?: string | null, userAgent?: string | null) {
  const db = requireService();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const { error } = await db.from("admin_sessions").insert({
    admin_id: adminId,
    token_hash: tokenHash,
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
    expires_at: expiresAt.toISOString(),
  });
  if (error) console.error("create session error:", error.message);
}

export async function invalidateSession(token: string) {
  const db = requireService();
  const tokenHash = hashToken(token);
  await db.from("admin_sessions").delete().eq("token_hash", tokenHash);
}

export async function invalidateAllAdminSessions(adminId: string) {
  const db = requireService();
  await db.from("admin_sessions").delete().eq("admin_id", adminId);
}

// ----- Login Rate Limiting (per-email) ----- //

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export async function checkLoginRateLimit(email: string): Promise<{ blocked: boolean; remainingMinutes?: number }> {
  const db = requireService();
  const { data: admin } = await db
    .from("admin_users")
    .select("failed_attempts, locked_until")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!admin) return { blocked: false };

  if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    const remainingMs = new Date(admin.locked_until).getTime() - Date.now();
    return { blocked: true, remainingMinutes: Math.ceil(remainingMs / 60000) };
  }

  if (admin.locked_until && new Date(admin.locked_until) <= new Date()) {
    await db.from("admin_users").update({ failed_attempts: 0, locked_until: null }).eq("email", email.toLowerCase().trim());
  }

  return { blocked: false };
}

export async function recordFailedAttempt(email: string) {
  const db = requireService();
  const { data: admin } = await db
    .from("admin_users")
    .select("id, failed_attempts")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!admin) return;

  const newAttempts = (admin.failed_attempts || 0) + 1;
  const updates: Record<string, unknown> = { failed_attempts: newAttempts };

  if (newAttempts >= MAX_FAILED_ATTEMPTS) {
    updates.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
  }

  await db.from("admin_users").update(updates).eq("id", admin.id);
}

export async function resetFailedAttempts(email: string) {
  const db = requireService();
  await db
    .from("admin_users")
    .update({ failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString(), last_login_ip: null })
    .eq("email", email.toLowerCase().trim());
}

// ----- Enhanced Audit Logging (v2) ----- //

export async function logAudit(params: {
  adminId: string;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    const db = requireService();
    const { data: admin } = await db
      .from("admin_users")
      .select("name, role")
      .eq("id", params.adminId)
      .single();

    const entry = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      actor_id: params.adminId,
      actor_name: admin?.name || null,
      actor_role: admin?.role || null,
      action: params.action,
      resource_type: params.resourceType || null,
      resource_id: params.resourceId || null,
      details: params.details || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      request_id: null,
      immutable: true,
    };

    // Write to audit table
    await db.from("audit_logs").insert(entry);
  } catch (e) {
    console.error("audit log exception:", e);
  }
}

// ----- Middleware ----- //

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = verifyToken(authHeader.slice(7));
    (req as any).admin = decoded;
    (req as any).adminIp = getClientIp(req);
    (req as any).ipAddress = getClientIp(req);
    (req as any).userAgent = getUserAgent(req);
    (req as any).requestId = (req.headers["x-request-id"] as string) || uuid();
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const admin = (req as any).admin;
  if (!admin || admin.role !== "super_admin") {
    return res.status(403).json({ error: "Super admin only" });
  }
  next();
}

export function requireAdminOrAbove(req: Request, res: Response, next: NextFunction) {
  const admin = (req as any).admin;
  if (!admin || admin.role === "viewer") {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  next();
}

// ----- Data Isolation Helpers ----- //

export function maskSensitiveData(donation: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...donation };
  if (masked.phone) {
    const phone = masked.phone as string;
    masked.phone = phone.slice(0, 6) + "****";
  }
  return masked;
}

export function filterDonationsByRole(
  donations: Record<string, unknown>[],
  role: string
): Record<string, unknown>[] {
  return donations.map((d) => {
    if (role === "viewer") {
      if (d.status !== "completed") return null;
      return maskSensitiveData(d);
    }
    if (role === "admin") {
      return maskSensitiveData(d);
    }
    return d;
  }).filter(Boolean) as Record<string, unknown>[];
}
