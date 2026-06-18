import { requireDb } from "../_supabase.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const slug = req.query.slug;
    const db = requireDb();
    const { data, error } = await db
      .from("campaigns")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Server error" });
  }
}
