import { requireDb } from "../_supabase.js";
import { getAdmin, logAudit } from "../_admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdmin(req);
  if (!admin) return res.status(401).json({ error: "Missing or invalid token" });

  try {
    const db = requireDb();
    const { data, error } = await db
      .from("donations")
      .select("id, donor_name, amount, method, status, receipt_number, message, honored_member_id, created_at, campaign_id")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      adminId: admin.id,
      action: "export_ledger",
      resourceType: "donation",
      details: { count: data?.length },
    });

    const lines = ["Donor,Amount,Method,Status,Receipt,Campaign,Date"];
    for (const d of data || []) {
      const esc = (v: string | null | undefined) => (v || "").replace(/,/g, " ");
      lines.push(`${esc(d.donor_name)},${d.amount},${d.method},${d.status},${esc(d.receipt_number)},${esc(d.campaign_id)},${d.created_at}`);
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=harambee-ledger.csv");
    res.send(lines.join("\n"));
  } catch (err: any) {
    console.error("ledger export error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}
