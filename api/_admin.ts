import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { requireDb } from "./_supabase.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function signToken(payload: { id: string; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function getAdmin(req: any): { id: string; email: string; role: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(authHeader.slice(7), JWT_SECRET) as any;
  } catch {
    return null;
  }
}

export async function logAudit(params: {
  adminId: string;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}) {
  const db = requireDb();
  await db.from("audit_logs").insert({
    admin_id: params.adminId,
    action: params.action,
    resource_type: params.resourceType || null,
    resource_id: params.resourceId || null,
    details: params.details || null,
    ip_address: params.ipAddress || null,
  }).catch(() => {});
}
