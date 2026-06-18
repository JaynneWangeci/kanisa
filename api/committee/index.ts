import { requireDb } from "../_supabase.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const db = requireDb();
    const { data, error } = await db
      .from("committee_members")
      .select("*")
      .eq("is_active", true)
      .order("order", { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ members: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Server error" });
  }
}
