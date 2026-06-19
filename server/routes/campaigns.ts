import { Router } from "express";
import { requireService } from "../lib/supabase.js";

export const campaignsRouter = Router();

campaignsRouter.get("/:slug", async (req, res) => {
  try {
    const db = requireService();
    const { data } = await db
      .from("campaigns")
      .select("*")
      .eq("slug", req.params.slug)
      .eq("is_active", true)
      .single();

    if (!data) return res.status(404).json({ error: "Campaign not found" });

    const { data: sumData } = await db
      .from("donations")
      .select("amount")
      .eq("campaign_id", data.id)
      .eq("status", "completed");

    const raised = sumData?.reduce((acc, d) => acc + Number(d.amount), 0) || 0;

    res.json({
      id: data.id,
      slug: data.slug,
      title: data.title,
      description: data.description,
      goal: Number(data.goal),
      raised,
      currency: data.currency,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      is_active: data.is_active,
      created_at: data.created_at,
    });
  } catch (err) {
    console.error("campaign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
