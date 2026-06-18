import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { verifyPassword, signToken, verifyToken, logAudit, requireAdmin, getClientIp } from "../lib/admin.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const db = requireService();
    const { data: user, error } = await db
      .from("admin_users")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .single();

    const ip = getClientIp(req);

    if (error || !user || !verifyPassword(password, user.password_hash)) {
      if (user) {
        await logAudit({
          adminId: user.id,
          action: "failed_login",
          ipAddress: ip,
          details: { email: email.toLowerCase().trim() },
        });
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    await logAudit({
      adminId: user.id,
      action: "login",
      ipAddress: ip,
    });

    res.json({ token, admin: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.get("/me", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    const db = requireService();
    const { data } = await db.from("admin_users").select("id, email, name, role").eq("id", admin.id).single();
    if (!data) return res.status(404).json({ error: "Admin not found" });
    res.json({ admin: data });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.post("/logout", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "logout",
      ipAddress: (req as any).adminIp,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
