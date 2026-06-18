import { requireDb } from "../_supabase.js";
import { getAdmin, logAudit } from "../_admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const admin = getAdmin(req);
  if (!admin) return res.status(401).json({ error: "Missing or invalid token" });

  try {
    const db = requireDb();

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

    if (admin.role === "viewer") {
      await logAudit({ adminId: admin.id, action: "view_donations" });
    }

    const totalFromDonations = (completedDonations || []).reduce((s: number, d: any) => s + Number(d.amount), 0);
    const totalRaised = seedRaised + totalFromDonations;

    const donors = new Set(
      (completedDonations || []).map((d: any) => d.donor_name).filter(Boolean)
    );

    const { count: memberCount } = await db
      .from("committee_members")
      .select("*", { count: "exact", head: true });

    const stats = {
      goal,
      raised: totalRaised,
      total_raised: totalRaised,
      total_donors: campaignId ? donors.size + 15 : donors.size,
      avg_gift: donors.size ? Math.round(totalFromDonations / donors.size) : 0,
      pending_count: (pendingDonations || []).length,
      failed_count: (failedDonations || []).length,
      member_count: memberCount || 0,
      recent_donations: (completedDonations || []).slice(0, 20),
    };

    res.json(stats);
  } catch (err: any) {
    console.error("stats error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}
