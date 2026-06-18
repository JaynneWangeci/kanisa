import { requireDb } from "../_supabase.js";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

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
