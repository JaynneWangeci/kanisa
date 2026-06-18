import { requireDb } from "../_supabase.js";
import { verifyPassword, signToken } from "../_admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const db = requireDb();
    const { data: user, error } = await db
      .from("admin_users")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error || !user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    await db.from("audit_logs").insert({
      admin_id: user.id,
      action: "login",
      ip_address: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
    }).catch(() => {});

    res.json({ token, admin: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err: any) {
    console.error("login error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}
