import { Router } from "express";
import { requireService } from "../lib/supabase.js";

export const contributionsRouter = Router();

contributionsRouter.get("/breakdown", async (_req, res) => {
  try {
    const db = requireService();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [memberData, todayData, overallData, recentData] = await Promise.all([
      db.from("donations")
        .select("church_member_id, amount, status, church_members!inner(name, council)")
        .eq("status", "completed")
        .not("church_member_id", "is", null),

      db.from("donations")
        .select("amount", { count: "exact", head: false })
        .eq("status", "completed")
        .gte("created_at", todayStart.toISOString()),

      db.from("donations")
        .select("amount", { count: "exact", head: false })
        .eq("status", "completed"),

      db.from("donations")
        .select("id, donor_name, amount, message, created_at, church_member_id, church_members(name)")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const perMember: Record<string, { name: string; council: string; total: number; count: number }> = {};
    for (const d of memberData.data || []) {
      const member = (d as any).church_members;
      const id = d.church_member_id as string;
      if (!perMember[id]) {
        perMember[id] = { name: member?.name || "Unknown", council: member?.council || "", total: 0, count: 0 };
      }
      perMember[id].total += Number(d.amount);
      perMember[id].count += 1;
    }

    const members = Object.entries(perMember)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => b.total - a.total)
      .map((m, i) => ({ ...m, rank: i + 1 }));

    const todayTotal = (todayData.data || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);
    const overallTotal = (overallData.data || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);
    const overallCount = (overallData.data || []).length;

    const recent = (recentData.data || []).map((d: any) => ({
      id: d.id,
      donor_name: d.donor_name,
      amount: Number(d.amount),
      message: d.message,
      created_at: d.created_at,
      member_name: d.church_members?.name || null,
    }));

    res.json({ members, today_total: todayTotal, overall_total: overallTotal, overall_count: overallCount, recent });
  } catch (err) {
    console.error("contributions breakdown error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
