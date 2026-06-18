import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, requireAdminOrAbove, logAudit } from "../lib/admin.js";
import type { AuditAction } from "../lib/admin.js";

export const membersRouter = Router();

membersRouter.get("/", async (_req, res) => {
  try {
    const db = requireService();
    const { data, error } = await db
      .from("church_members")
      .select("*")
      .eq("is_active", true)
      .order("council")
      .order("name");

    if (error) return res.status(500).json({ error: error.message });
    res.json({ members: data || [] });
  } catch (err) {
    console.error("members error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

membersRouter.post("/", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { name, council } = req.body;
    if (!name || !council) return res.status(400).json({ error: "name and council required" });

    const { data, error } = await db
      .from("church_members")
      .insert({ name: name.trim(), council })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "create_church_member",
      resourceType: "church_member",
      resourceId: data.id,
      ipAddress: (req as any).adminIp,
    });

    res.status(201).json({ member: data });
  } catch (err) {
    console.error("member create error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

membersRouter.patch("/:id", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { name, council, is_active } = req.body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (council !== undefined) updates.council = council;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await db
      .from("church_members")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "update_church_member",
      resourceType: "church_member",
      resourceId: data.id,
      ipAddress: (req as any).adminIp,
    });

    res.json({ member: data });
  } catch (err) {
    console.error("member update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

membersRouter.delete("/:id", requireAdmin, requireAdminOrAbove, async (req, res) => {
  try {
    const db = requireService();
    const { error } = await db.from("church_members").delete().eq("id", req.params.id);

    if (error) return res.status(500).json({ error: error.message });

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "delete_church_member",
      resourceType: "church_member",
      resourceId: req.params.id,
      ipAddress: (req as any).adminIp,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("member delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
