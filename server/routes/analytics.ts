import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, logAudit } from "../lib/admin.js";
import { cacheGet, cacheSet, cacheKey } from "../lib/redis.js";

export const analyticsRouter = Router();

analyticsRouter.get("/dashboard", requireAdmin, async (req, res) => {
  try {
    const db = requireService();

    // Try cache first
    const cacheKeyStr = cacheKey("analytics", "dashboard");
    const cached = await cacheGet<any>(cacheKeyStr);
    if (cached) return res.json(cached);
    const now = new Date();
    const periods = {
      "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      "90d": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      "1y": new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    };
    const prev30d = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const p30Start = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const p30End = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      dailyData,
      prevData,
      topDonors,
      councilData,
      memberRanking,
      totals,
      pledgesData,
      memberCount,
      newMembers,
    ] = await Promise.all([
      // Current 90d daily data
      db.from("donations")
        .select("amount, created_at")
        .eq("status", "completed")
        .gte("created_at", periods["90d"].toISOString())
        .order("created_at", { ascending: true }),

      // Previous 30d for comparison
      db.from("donations")
        .select("amount")
        .eq("status", "completed")
        .gte("created_at", p30Start.toISOString())
        .lt("created_at", p30End.toISOString()),

      // Top donors
      db.from("donations")
        .select("donor_name, amount")
        .eq("status", "completed")
        .not("donor_name", "is", null)
        .order("amount", { ascending: false })
        .limit(20),

      // Council breakdown
      db.from("donations")
        .select("amount, church_members!church_member_id!inner(council)")
        .eq("status", "completed")
        .not("church_member_id", "is", null),

      // Member honour ranking
      db.from("donations")
        .select("amount, church_member_id, church_members!church_member_id!inner(name, council)")
        .eq("status", "completed")
        .not("church_member_id", "is", null),

      // All totals
      db.from("donations")
        .select("amount", { count: "exact", head: false })
        .eq("status", "completed"),

      // Pledge stats
      db.from("pledges")
        .select("amount, paid, remaining, status"),

      // Member count
      db.from("church_members")
        .select("id", { count: "exact", head: false })
        .eq("is_active", true),

      // New members in last 30d
      db.from("church_members")
        .select("id", { count: "exact", head: false })
        .eq("is_active", true)
        .gte("created_at", periods["30d"].toISOString()),
    ]);

    // ── Daily aggregation ──
    const dailyMap: Record<string, number> = {};
    for (const d of dailyData.data || []) {
      const day = (d.created_at as string).slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + Number(d.amount);
    }
    const daily = Object.entries(dailyMap)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ── Weekly aggregation ──
    const weeklyMap: Record<string, { total: number; count: number }> = {};
    for (const d of dailyData.data || []) {
      const dt = new Date(d.created_at as string);
      const weekStart = new Date(dt);
      weekStart.setDate(dt.getDate() - dt.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      if (!weeklyMap[weekKey]) weeklyMap[weekKey] = { total: 0, count: 0 };
      weeklyMap[weekKey].total += Number(d.amount);
      weeklyMap[weekKey].count += 1;
    }
    const weekly = Object.entries(weeklyMap)
      .map(([week, { total, count }]) => ({ week, total, count }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // ── Monthly aggregation ──
    const monthlyMap: Record<string, { total: number; count: number }> = {};
    for (const d of dailyData.data || []) {
      const monthKey = (d.created_at as string).slice(0, 7);
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { total: 0, count: 0 };
      monthlyMap[monthKey].total += Number(d.amount);
      monthlyMap[monthKey].count += 1;
    }
    const monthly = Object.entries(monthlyMap)
      .map(([month, { total, count }]) => ({ month, total, count }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // ── Period totals for KPI comparison ──
    const currentTotal = (dailyData.data || []).reduce((s, d) => s + Number(d.amount), 0);
    const previousTotal = (prevData.data || []).reduce((s, d) => s + Number(d.amount), 0);
    const periodChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    const currentCount = (dailyData.data || []).length;
    const previousCount = (prevData.data || []).length;
    const countChange = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0;

    // ── Top donors ──
    const donorMap: Record<string, number> = {};
    for (const d of topDonors.data || []) {
      const name = d.donor_name || "Anonymous";
      donorMap[name] = (donorMap[name] || 0) + Number(d.amount);
    }
    const topDonorsList = Object.entries(donorMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20);

    // ── Council breakdown (with counts) ──
    const councilMap: Record<string, { total: number; count: number }> = {};
    for (const d of councilData.data || []) {
      const council = (d as any).church_members?.council || "unknown";
      const amt = Number(d.amount);
      if (!councilMap[council]) councilMap[council] = { total: 0, count: 0 };
      councilMap[council].total += amt;
      councilMap[council].count += 1;
    }
    const councilBreakdown = Object.entries(councilMap)
      .map(([council, { total, count }]) => ({ council, total, count }))
      .sort((a, b) => b.total - a.total);

    // ── Member honour ranking ──
    const memberMap: Record<string, { name: string; council: string; total: number; count: number }> = {};
    for (const d of memberRanking.data || []) {
      const member = (d as any).church_members;
      const id = d.church_member_id as string;
      if (!memberMap[id]) {
        memberMap[id] = { name: member?.name || "Unknown", council: member?.council || "", total: 0, count: 0 };
      }
      memberMap[id].total += Number(d.amount);
      memberMap[id].count += 1;
    }
    const memberRankingList = Object.entries(memberMap)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 30);

    // ── Overall totals ──
    const overallTotal = (totals.data || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);
    const overallCount = (totals.data || []).length;
    const avgGift = overallCount > 0 ? Math.round(overallTotal / overallCount) : 0;

    // ── Pledge analytics ──
    const pledges = pledgesData.data || [];
    const pledgeTotal = pledges.reduce((s, p) => s + Number(p.amount), 0);
    const pledgePaid = pledges.reduce((s, p) => s + Number(p.paid), 0);
    const pledgeRemaining = pledges.reduce((s, p) => s + Number(p.remaining), 0);
    const pledgeFulfilled = pledges.filter(p => p.status === "fulfilled").length;
    const pledgeActive = pledges.filter(p => p.status === "active").length;
    const pledgeFulfillmentRate = pledgeTotal > 0 ? (pledgePaid / pledgeTotal) * 100 : 0;

    // ── Current 30d stats for KPI cards ──
    const cur30Total = dailyData.data
      ?.filter((d: any) => new Date(d.created_at) >= periods["30d"])
      .reduce((s, d) => s + Number(d.amount), 0) || 0;

    const cur30Count = dailyData.data
      ?.filter((d: any) => new Date(d.created_at) >= periods["30d"])
      .length || 0;

    // ── Payment method breakdown ──
    const { data: methodData } = await db
      .from("donations")
      .select("method, amount")
      .eq("status", "completed");

    const methodMap: Record<string, number> = {};
    for (const d of methodData || []) {
      const method = d.method || "unknown";
      methodMap[method] = (methodMap[method] || 0) + Number(d.amount);
    }
    const methodBreakdown = Object.entries(methodMap)
      .map(([method, total]) => ({ method, total }))
      .sort((a, b) => b.total - a.total);

    await logAudit({
      adminId: (req as any).admin.id,
      action: "view_dashboard_analytics",
      ipAddress: (req as any).adminIp,
    });

    // Harambee event info
    const { data: harambeeSetting } = await db.from("settings").select("*").eq("key", "harambee_date").single();
    const harambeeDateStr = harambeeSetting?.value || "2026-09-27";
    const harambeeEventDate = new Date(harambeeDateStr + "T23:59:59+03:00");
    const harambeeDiffMs = harambeeEventDate.getTime() - Date.now();
    const harambeeDaysRemaining = Math.max(0, Math.ceil(harambeeDiffMs / (1000 * 60 * 60 * 24)));

    const result = {
      kpis: {
        current30d_total: cur30Total,
        current30d_count: cur30Count,
        total_raised: overallTotal,
        total_donations: overallCount,
        avg_gift: avgGift,
        period_change: Math.round(periodChange * 10) / 10,
        count_change: Math.round(countChange * 10) / 10,
      },
      trends: {
        daily,
        weekly,
        monthly,
      },
      breakdowns: {
        council: councilBreakdown,
        method: methodBreakdown,
        top_donors: topDonorsList,
      },
      members: {
        total: memberCount.count || 0,
        new_30d: newMembers.count || 0,
        ranking: memberRankingList,
      },
      pledges: {
        total: pledgeTotal,
        paid: pledgePaid,
        remaining: pledgeRemaining,
        fulfilled: pledgeFulfilled,
        active: pledgeActive,
        fulfillment_rate: Math.round(pledgeFulfillmentRate * 10) / 10,
      },
      harambee: {
        date: harambeeDateStr,
        days_remaining: harambeeDaysRemaining,
        passed: harambeeDiffMs < 0,
      },
    };

    // Cache for 60 seconds
    await cacheSet(cacheKeyStr, result, 60);

    res.json(result);
  } catch (err) {
    console.error("analytics dashboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
