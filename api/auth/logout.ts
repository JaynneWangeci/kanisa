import { getAdmin, logAudit } from "../_admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdmin(req);
  if (!admin) return res.status(401).json({ error: "Missing or invalid token" });

  try {
    await logAudit({
      adminId: admin.id,
      action: "logout",
      ipAddress: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || null,
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Server error" });
  }
}
