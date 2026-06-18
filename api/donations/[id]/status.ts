import { requireDb } from "../../_supabase.js";
import { getAdmin, logAudit } from "../../_admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdmin(req);
  if (!admin) return res.status(401).json({ error: "Missing or invalid token" });

  try {
    const db = requireDb();
    const { status, receipt_number } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });

    const { data, error } = await db
      .from("donations")
      .update({ status, receipt_number: receipt_number || null })
      .eq("id", req.query.id || req.params?.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      adminId: admin.id,
      action: "view_donation",
      resourceType: "donation",
      resourceId: data.id,
    });

    res.json({ donation: data });
  } catch (err: any) {
    console.error("donation status error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}
