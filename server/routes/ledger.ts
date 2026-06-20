import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, logAudit } from "../lib/admin.js";

export const ledgerRouter = Router();

ledgerRouter.get("/export", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    if (admin.role === "viewer") {
      return res.status(403).json({ error: "Viewers cannot export ledger" });
    }

    const db = requireService();
    const { data, error } = await db
      .from("donations")
      .select("id, donor_name, amount, method, status, receipt_number, phone, message, honored_member_id, church_member_id, created_at, campaign_id")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      adminId: admin.id,
      action: "export_ledger",
      resourceType: "donation",
      details: { count: data?.length },
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    const lines = ["Donor,Amount,Method,Status,Receipt,MemberId,Campaign,Date"];
    for (const d of data || []) {
      const esc = (v: string | null | undefined) => (v || "").replace(/,/g, " ");
      lines.push(`${esc(d.donor_name)},${d.amount},${d.method},${d.status},${esc(d.receipt_number)},${esc(d.church_member_id || d.honored_member_id)},${esc(d.campaign_id)},${d.created_at}`);
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=harambee-ledger.csv");
    res.send(lines.join("\n"));
  } catch (err) {
    console.error("ledger export error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
