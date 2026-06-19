import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import {
  requireAdmin, requireSuperAdmin, logAudit,
  filterDonationsByRole, verifyPassword, hashPassword, getClientIp,
} from "../lib/admin.js";

export const adminRouter = Router();

adminRouter.get("/stats", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    const db = requireService();

    const { data: campaign } = await db
      .from("campaigns")
      .select("*")
      .eq("slug", "development-fund")
      .single();

    const goal = Number(campaign?.goal || 30000000);
    const campaignId = campaign?.id;

    const { data: completedDonations } = await db
      .from("donations")
      .select("id, amount, donor_name, status, method, receipt_number, phone, message, created_at, campaign_id")
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

    await logAudit({
      adminId: admin.id,
      action: "view_stats",
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    const totalRaised = (completedDonations || []).reduce((s, d) => s + Number(d.amount), 0);

    const donors = new Set(
      (completedDonations || [])
        .map((d) => d.donor_name)
        .filter(Boolean)
    );

    const filtered = filterDonationsByRole(completedDonations || [], admin.role);
    const maskedDonations = filtered.slice(0, 20);

    const stats = {
      goal,
      raised: totalRaised,
      total_raised: totalRaised,
      total_donors: donors.size,
      avg_gift: donors.size ? Math.round(totalRaised / donors.size) : 0,
      pending_count: (pendingDonations || []).length,
      failed_count: (failedDonations || []).length,
      member_count: 0,
      recent_donations: maskedDonations,
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
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      adminId: admin.id,
      action: "view_audit_logs",
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
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
      userAgent: (req as any).userAgent,
    });

    res.status(201).json({ admin: data });
  } catch (err) {
    console.error("create admin error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.get("/users", requireAdmin, requireSuperAdmin, async (_req, res) => {
  try {
    const db = requireService();
    const { data, error } = await db
      .from("admin_users")
      .select("id, email, name, role, created_at")
      .order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ users: data || [] });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.put("/users/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const db = requireService();
    const { email, name, role } = req.body;
    const updates: Record<string, string> = {};
    if (email) updates.email = email.toLowerCase().trim();
    if (name) updates.name = name;
    if (role) updates.role = role;

    const { data, error } = await db
      .from("admin_users")
      .update(updates)
      .eq("id", req.params.id)
      .select("id, email, name, role")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const superAdmin = (req as any).admin;
    await logAudit({
      adminId: superAdmin.id,
      action: "update_admin",
      resourceType: "admin_user",
      resourceId: data.id,
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({ admin: data });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.delete("/users/:id", requireAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const db = requireService();
    const superAdmin = (req as any).admin;

    const { data: target } = await db
      .from("admin_users")
      .select("id")
      .eq("id", req.params.id)
      .single();

    if (!target) return res.status(404).json({ error: "Admin not found" });
    if (target.id === superAdmin.id) {
      return res.status(400).json({ error: "Cannot delete yourself" });
    }

    const { error } = await db.from("admin_users").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      adminId: superAdmin.id,
      action: "delete_admin",
      resourceType: "admin_user",
      resourceId: req.params.id,
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

adminRouter.put("/users/:id/password", requireAdmin, async (req, res) => {
  try {
    const db = requireService();
    const admin = (req as any).admin;
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const isSelf = admin.id === req.params.id;

    if (isSelf) {
      const { data: user } = await db
        .from("admin_users")
        .select("password_hash")
        .eq("id", admin.id)
        .single();

      if (!user || !verifyPassword(currentPassword, user.password_hash)) {
        return res.status(403).json({ error: "Current password is incorrect" });
      }
    } else if (admin.role !== "super_admin") {
      return res.status(403).json({ error: "Only super_admin can change other admins' passwords" });
    }

    const hash = hashPassword(newPassword);
    const { error } = await db
      .from("admin_users")
      .update({ password_hash: hash })
      .eq("id", req.params.id);

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      adminId: admin.id,
      action: isSelf ? "update_self_password" : "update_admin",
      resourceType: "admin_user",
      resourceId: req.params.id,
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({ ok: true });
  } catch {
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
