import { requireDb } from "../../_supabase.js";
import { getAdmin, logAudit } from "../../_admin.js";

export default async function handler(req: any, res: any) {
  const admin = getAdmin(req);
  if (!admin) return res.status(401).json({ error: "Missing or invalid token" });
  if (admin.role === "viewer") return res.status(403).json({ error: "Insufficient permissions" });

  const id = req.query.id || req.params?.id;
  if (!id) return res.status(400).json({ error: "id required" });

  try {
    const db = requireDb();

    if (req.method === "PATCH") {
      const { name, role, council, photo_url, order } = req.body;
      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (role !== undefined) updates.role = role;
      if (council !== undefined) updates.council = council;
      if (photo_url !== undefined) updates.photo_url = photo_url;
      if (order !== undefined) updates.order = order;

      const { data, error } = await db
        .from("committee_members")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      await logAudit({
        adminId: admin.id,
        action: "update_committee",
        resourceType: "committee_member",
        resourceId: data.id,
      });

      return res.json({ member: data });
    }

    if (req.method === "DELETE") {
      const { error } = await db.from("committee_members").delete().eq("id", id);
      if (error) return res.status(500).json({ error: error.message });

      await logAudit({
        adminId: admin.id,
        action: "delete_committee",
        resourceType: "committee_member",
        resourceId: id,
      });

      return res.json({ ok: true });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("committee error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}
