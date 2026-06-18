import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { requireService } from "./supabase.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRES = "24h";

const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 100;
const reqCounts = new Map<string, { count: number; resetAt: number }>();

export type AuditAction =
  | "login" | "logout" | "failed_login"
  | "view_donations" | "view_donation" | "update_donation"
  | "export_ledger"
  | "view_stats"
  | "view_members"
  | "create_committee" | "update_committee" | "delete_committee"
  | "view_church_members" | "create_church_member" | "update_church_member" | "delete_church_member"
  | "view_audit_logs"
  | "create_admin" | "update_admin";

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

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip?.replace(/^::ffff:/, "") || req.socket.remoteAddress?.replace(/^::ffff:/, "") || "unknown";
}

export async function setAdminContext(adminId: string, role: string) {
  try {
    const db = requireService();
    await db.rpc("set_admin_context", { admin_id: adminId, role });
  } catch {
    // non-critical: RLS context is a fallback, not primary auth
  }
}

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

export async function logAudit(params: {
  adminId: string;
  action: AuditAction;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  try {
    const db = requireService();
    const { error } = await db.from("audit_logs").insert({
      admin_id: params.adminId,
      action: params.action,
      resource_type: params.resourceType || null,
      resource_id: params.resourceId || null,
      details: params.details || null,
      ip_address: params.ipAddress || null,
    });
    if (error) console.error("audit log error:", error.message);
  } catch (e) {
    console.error("audit log exception:", e);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = verifyToken(authHeader.slice(7));
    (req as any).admin = decoded;
    (req as any).adminIp = getClientIp(req);
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
