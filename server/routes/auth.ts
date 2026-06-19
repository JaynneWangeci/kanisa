import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import {
  hashPassword, verifyPassword, signToken, verifyToken,
  logAudit, requireAdmin, getClientIp,
  createSession, invalidateSession,
  checkLoginRateLimit, recordFailedAttempt, resetFailedAttempts,
} from "../lib/admin.js";

export const authRouter = Router();

authRouter.get("/check-setup", async (_req, res) => {
  try {
    const db = requireService();
    const { data, error } = await db.from("admin_users").select("id").limit(1);
    if (error) return res.json({ can_setup: false });
    res.json({ can_setup: !data || data.length === 0 });
  } catch {
    res.json({ can_setup: false });
  }
});

authRouter.post("/setup", async (req, res) => {
  try {
    const db = requireService();

    const { data: existing } = await db.from("admin_users").select("id").limit(1);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "Setup already completed. An admin already exists." });
    }

    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password, and name required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const passwordHash = hashPassword(password);
    const { data: admin, error } = await db
      .from("admin_users")
      .insert({ email: email.toLowerCase().trim(), password_hash: passwordHash, name, role: "super_admin" })
      .select("id, email, name, role")
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const token = signToken({ id: admin.id, email: admin.email, role: admin.role });

    await logAudit({
      adminId: admin.id,
      action: "login",
      ipAddress: getClientIp(req),
    });

    res.status(201).json({ token, admin });
  } catch (err) {
    console.error("setup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const normalizedEmail = email.toLowerCase().trim();
    const ip = getClientIp(req);
    const ua = (req.headers["user-agent"] || "").slice(0, 512) || null;

    const rateCheck = await checkLoginRateLimit(normalizedEmail);
    if (rateCheck.blocked) {
      return res.status(429).json({
        error: `Account locked due to too many failed attempts. Try again in ${rateCheck.remainingMinutes} minutes.`,
      });
    }

    const db = requireService();
    const { data: user, error } = await db
      .from("admin_users")
      .select("*")
      .eq("email", normalizedEmail)
      .single();

    if (error || !user || !verifyPassword(password, user.password_hash)) {
      await recordFailedAttempt(normalizedEmail);

      if (user) {
        await logAudit({
          adminId: user.id,
          action: "failed_login",
          ipAddress: ip,
          userAgent: ua,
          details: { email: normalizedEmail },
        });
      }

      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    await createSession(user.id, token, ip, ua);
    await resetFailedAttempts(normalizedEmail);
    await db.from("admin_users").update({ last_login_ip: ip }).eq("id", user.id);

    await logAudit({
      adminId: user.id,
      action: "login",
      ipAddress: ip,
      userAgent: ua,
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
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";

    await invalidateSession(token);
    await logAudit({
      adminId: admin.id,
      action: "logout",
      ipAddress: (req as any).adminIp,
      userAgent: (req as any).userAgent,
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});
