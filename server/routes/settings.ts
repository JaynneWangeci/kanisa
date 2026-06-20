import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, requireAdminOrAbove, logAudit } from "../lib/admin.js";

export const settingsRouter = Router();

settingsRouter.get("/", async (_req, res) => {
  try {
    const db = requireService();
    const { data, error } = await db.from("settings").select("*");
    if (error) return res.status(500).json({ error: error.message });
    const map: Record<string, string> = {};
    for (const row of data || []) map[row.key] = row.value;
    res.json({ settings: map });
  } catch (err) {
    console.error("settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

settingsRouter.put("/", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const entries = req.body;
    if (!entries || typeof entries !== "object") {
      return res.status(400).json({ error: "Expected object of key-value pairs" });
    }
    for (const [key, value] of Object.entries(entries)) {
      if (typeof key !== "string" || typeof value !== "string") continue;
      await db.from("settings").upsert({ key, value }, { onConflict: "key" });
    }
    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "update_settings",
      resourceType: "setting",
      resourceId: Object.keys(entries).join(","),
      ipAddress: (req as any).ipAddress,
      userAgent: (req as any).userAgent,
});

// Harambee event info (public, no auth)
settingsRouter.get("/harambee", async (_req, res) => {
  try {
    const db = requireService();
    const { data } = await db.from("settings").select("*").eq("key", "harambee_date").single();
    const dateStr = data?.value || "2026-09-27";
    const eventDate = new Date(dateStr + "T23:59:59+03:00");
    const now = new Date();
    const diffMs = eventDate.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    res.json({ date: dateStr, days_remaining: daysRemaining, passed: diffMs < 0 });
  } catch {
    res.json({ date: "2026-09-27", days_remaining: 99, passed: false });
  }
});

    res.json({ ok: true });
  } catch (err) {
    console.error("settings update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
