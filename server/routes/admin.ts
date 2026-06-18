import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, requireSuperAdmin, logAudit } from "../lib/admin.js";

export const adminRouter = Router();

adminRouter.get("/stats", requireAdmin, async (req, res) => {
  try {
    const db = requireService();

    const { data: campaign } = await db
      .from("campaigns")
      .select("*")
      .eq("slug", "development-fund")
      .single();

    const goal = Number(campaign?.goal || 5000000);
    const seedRaised = Number(campaign?.raised || 0);
    const campaignId = campaign?.id;

    const { data: completedDonations } = await db
      .from("donations")
      .select("amount, donor_name, status, id, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const { data: pendingDonations } = await db
      .from("donations")
      .select("amount")
      .eq("status", "pending");

    const { data: failedDonations } = await db
      .from("donations")
      .select("amount")
      .eq("status", "failed");

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "view_stats",
      ipAddress: (req as any).adminIp,
    });

    const totalFromDonations = (completedDonations || []).reduce((s, d) => s + Number(d.amount), 0);
    const totalRaised = seedRaised + totalFromDonations;

    const donors = new Set(
      (completedDonations || [])
        .map((d) => d.donor_name)
        .filter(Boolean)
    );

    const stats = {
      goal,
      raised: totalRaised,
      total_raised: totalRaised,
      total_donors: campaignId ? donors.size + 15 : donors.size,
      avg_gift: donors.size ? Math.round(totalFromDonations / donors.size) : 0,
      pending_count: (pendingDonations || []).length,
      failed_count: (failedDonations || []).length,
      member_count: 0,
      recent_donations: (completedDonations || []).slice(0, 20),
    };

    const { count: memberCount } = await db
      .from("committee_members")
      .select("*", { count: "exact", head: true });

    stats.member_count = memberCount || 0;

    res.json(stats);
  } catch (err) {
    console.error("stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.get("/audit-logs", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    if (admin.role !== "super_admin") {
      return res.status(403).json({ error: "Super admin only" });
    }

    const db = requireService();
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const { data, error } = await db
      .from("audit_logs")
      .select("id, action, resource_type, resource_id, details, ip_address, created_at, admin_name")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      adminId: admin.id,
      action: "view_audit_logs",
      ipAddress: (req as any).adminIp,
    });

    res.json({ logs: data || [] });
  } catch (err) {
    console.error("audit logs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.post("/admins", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const db = requireService();
    const { email, name, password, role } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: "email, name, password required" });
    }

    const bcrypt = await import("bcryptjs");
    const password_hash = bcrypt.hashSync(password, 10);

    const { data, error } = await db
      .from("admin_users")
      .insert({ email: email.toLowerCase().trim(), name, password_hash, role: role || "viewer" })
      .select("id, email, name, role")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const superAdmin = (req as any).admin;
    await logAudit({
      adminId: superAdmin.id,
      action: "create_admin",
      resourceType: "admin_user",
      resourceId: data.id,
      ipAddress: (req as any).adminIp,
    });

    res.status(201).json({ admin: data });
  } catch (err) {
    console.error("create admin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.get("/audit-actions", requireAdmin, requireSuperAdmin, async (_req, res) => {
  try {
    const db = requireService();
    const { data } = await db
      .from("audit_logs")
      .select("action")
      .order("created_at", { ascending: false })
      .limit(1000);

    const actions = [...new Set((data || []).map((l: { action: string }) => l.action))];
    res.json({ actions });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
