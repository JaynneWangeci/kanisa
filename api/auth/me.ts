import { requireDb } from "../_supabase.js";
import { getAdmin } from "../_admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdmin(req);
  if (!admin) return res.status(401).json({ error: "Missing or invalid token" });

  try {
    const db = requireDb();
    const { data } = await db
      .from("admin_users")
      .select("id, email, name, role")
      .eq("id", admin.id)
      .single();

    if (!data) return res.status(404).json({ error: "Admin not found" });
    res.json({ admin: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Server error" });
  }
}
