import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, logAudit } from "../lib/admin.js";

export const donationsRouter = Router();

donationsRouter.get("/", async (req, res) => {
  try {
    const db = requireService();
    const { campaign_id, status, limit, offset } = req.query;
    let query = db.from("donations").select("*").order("created_at", { ascending: false });

    if (campaign_id) query = query.eq("campaign_id", campaign_id);
    if (status) query = query.eq("status", status);
    if (limit) query = query.limit(Number(limit));
    if (offset) query = query.range(Number(offset), Number(offset) + 49);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ donations: data || [] });
  } catch (err) {
    console.error("donations error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

donationsRouter.post("/", async (req, res) => {
  try {
    const db = requireService();
    const { campaign_id, donor_name, amount, phone, honored_member_id, church_member_id, message } = req.body;

    if (!campaign_id || !amount || !phone) {
      return res.status(400).json({ error: "campaign_id, amount, and phone required" });
    }

    if (amount < 10) return res.status(400).json({ error: "Minimum donation is KES 10" });

    const normalizedPhone = phone.replace(/^0+/, "254").replace(/^\+/, "");

    const { data, error } = await db
      .from("donations")
      .insert({
        campaign_id,
        donor_name: donor_name || null,
        amount: Number(amount),
        method: "mpesa",
        status: "pending",
        phone: normalizedPhone,
        honored_member_id: honored_member_id || null,
        church_member_id: church_member_id || null,
        message: message || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ donation: data });
  } catch (err) {
    console.error("donation create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

donationsRouter.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    const db = requireService();
    const { status, receipt_number } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });

    const { data, error } = await db
      .from("donations")
      .update({ status, receipt_number: receipt_number || null })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "update_donation",
      resourceType: "donation",
      resourceId: data.id,
      details: { status },
      ipAddress: (req as any).adminIp,
    });

    res.json({ donation: data });
  } catch (err) {
    console.error("donation status error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
