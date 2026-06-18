import { requireDb } from "../_supabase.js";
import { getAdmin, requireAdmin, logAudit } from "../_admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdmin(req);
  if (!admin) return res.status(401).json({ error: "Missing or invalid token" });
  if (admin.role !== "super_admin") return res.status(403).json({ error: "Super admin only" });

  try {
    const db = requireDb();
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const { data, error } = await db
      .from("audit_logs")
      .select("id, action, resource_type, resource_id, details, ip_address, created_at, admin_name")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({ adminId: admin.id, action: "view_audit_logs" });

    res.json({ logs: data || [] });
  } catch (err: any) {
    console.error("audit logs error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}
