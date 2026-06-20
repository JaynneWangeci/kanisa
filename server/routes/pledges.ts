import { Router } from "express";
import { requireService } from "../lib/supabase.js";

export const pledgesRouter = Router();

pledgesRouter.post("/", async (req, res) => {
  try {
    const db = requireService();
    const { donor_name, amount, phone, whatsapp_number, reminder_freq, campaign_id } = req.body;
    if (!donor_name || !amount) return res.status(400).json({ error: "donor_name and amount required" });

    const { data: campaign } = await db
      .from("campaigns")
      .select("id")
      .eq("slug", campaign_id || "development-fund")
      .single();

    const { data, error } = await db
      .from("pledges")
      .insert({
        donor_name: donor_name.trim(),
        amount: Number(amount),
        phone,
        whatsapp_number,
        reminder_freq: reminder_freq || "weekly",
        paid: 0,
        remaining: Number(amount),
        campaign_id: campaign?.id,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ pledge: data });
  } catch (err) {
    console.error("pledge create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.get("/", async (_req, res) => {
  try {
    const db = requireService();
    const { data, error } = await db
      .from("pledges")
      .select("id, donor_name, amount, paid, remaining, status, rating, color_hex, created_at")
      .order("amount", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ pledges: data || [] });
  } catch (err) {
    console.error("pledges list error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.get("/:name", async (req, res) => {
  try {
    const db = requireService();
    const { data: pledges, error } = await db
      .from("pledges")
      .select("id, donor_name, amount, paid, remaining, status, rating, created_at")
      .ilike("donor_name", `%${req.params.name}%`)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const { data: honoured } = await db
      .from("donations")
      .select("id, donor_name, amount, created_at, church_members!inner(name)")
      .eq("status", "completed")
      .ilike("church_members.name", `%${req.params.name}%`)
      .order("created_at", { ascending: false });

    res.json({ pledges: pledges || [], honoured: honoured || [] });
  } catch (err) {
    console.error("pledge search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.get("/search/name", async (req, res) => {
  try {
    const db = requireService();
    const q = String(req.query.q || "").trim();
    if (!q) return res.json({ pledges: [], donations: [], honoured: [] });

    const { data: pledges } = await db
      .from("pledges")
      .select("id, donor_name, amount, paid, remaining, status, rating, color_hex, created_at")
      .ilike("donor_name", `%${q}%`)
      .order("amount", { ascending: false });

    const { data: donations } = await db
      .from("donations")
      .select("id, donor_name, amount, created_at, honored_member_id, receipt_number")
      .eq("status", "completed")
      .or(`donor_name.ilike.%${q}%,honored_member_id.in.(select id from church_members where name ilike '%${q}%')`)
      .order("created_at", { ascending: false });

    const { data: honoured } = await db
      .from("donations")
      .select("id, donor_name, amount, created_at, church_members!inner(name)")
      .eq("status", "completed")
      .ilike("church_members.name", `%${q}%`)
      .order("created_at", { ascending: false });

    res.json({ pledges: pledges || [], donations: donations || [], honoured: honoured || [] });
  } catch (err) {
    console.error("pledge search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

pledgesRouter.patch("/:id/pay", async (req, res) => {
  try {
    const db = requireService();
    const { amount, receipt_number } = req.body;
    if (!amount) return res.status(400).json({ error: "amount required" });

    const { data: pledge } = await db.from("pledges").select("*").eq("id", req.params.id).single();
    if (!pledge) return res.status(404).json({ error: "Pledge not found" });

    const newPaid = Number(pledge.paid) + Number(amount);
    const newRemaining = Math.max(0, Number(pledge.amount) - newPaid);
    const newStatus = newRemaining <= 0 ? "fulfilled" : pledge.status;

    await db.from("pledge_payments").insert({
      pledge_id: req.params.id,
      amount: Number(amount),
      receipt_number,
    });

    const { data, error } = await db
      .from("pledges")
      .update({ paid: newPaid, remaining: newRemaining, status: newStatus })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ pledge: data });
  } catch (err) {
    console.error("pledge pay error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
