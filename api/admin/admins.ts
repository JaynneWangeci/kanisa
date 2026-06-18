import { requireDb } from "../_supabase.js";
import { getAdmin } from "../_admin.js";
import { logAudit } from "../_admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdmin(req);
  if (!admin) return res.status(401).json({ error: "Missing or invalid token" });
  if (admin.role !== "super_admin") return res.status(403).json({ error: "Super admin only" });

  try {
    const db = requireDb();
    const { email, name, password, role } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: "email, name, password required" });
    }

    const bcrypt = await import("bcryptjs");
    const password_hash = bcrypt.hashSync(password, 10);

    const { data, error } = await db
      .from("admin_users")
      .insert({ email: email.toLowerCase().trim(), name, password_hash, role: role || "viewer" })
      .select("id, email, name, role")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({ adminId: admin.id, action: "create_admin", resourceType: "admin_user", resourceId: data.id });

    res.status(201).json({ admin: data });
  } catch (err: any) {
    console.error("create admin error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}
