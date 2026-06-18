import { requireDb } from "../_supabase.js";
import { getAdmin } from "../_admin.js";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "GET") {
    return handleGet(req, res);
  }

  if (req.method === "POST") {
    return handlePost(req, res);
  }

  res.status(405).json({ error: "Method not allowed" });
}

async function handleGet(req: any, res: any) {
  try {
    const db = requireDb();
    const { campaign_id, status, limit, offset } = req.query;
    let query: any = db.from("donations").select("*").order("created_at", { ascending: false });

    if (campaign_id) query = query.eq("campaign_id", campaign_id);
    if (status) query = query.eq("status", status);
    if (limit) query = query.limit(Number(limit));
    if (offset) query = query.range(Number(offset), Number(offset) + 49);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ donations: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Server error" });
  }
}

async function handlePost(req: any, res: any) {
  try {
    const { campaign_id, donor_name, amount, phone, message, honored_member_id } = req.body;

    if (!campaign_id || !amount || !phone) {
      res.status(400).json({ error: "campaign_id, amount, and phone are required" });
      return;
    }

    const db = requireDb();
    const { data, error } = await db
      .from("donations")
      .insert({
        campaign_id,
        donor_name: donor_name || null,
        amount,
        phone,
        message: message || null,
        honored_member_id: honored_member_id || null,
        method: "mpesa",
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json({ donation: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Server error" });
  }
}
