import { requireDb } from "../_supabase.js";

const FALLBACK = {
  id: "dev-fund",
  slug: "development-fund",
  title: "AIPCA Bahati Cathedral Development Fund",
  description: "Tujenge pamoja – Building our house of worship together. Support the sanctuary improvements, fellowship hall, ministry growth, and grounds maintenance.",
  goal: 5000000,
  raised: 842500,
  currency: "KES",
  is_active: true,
};

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const slug = req.query.slug;
    const db = requireDb();
    const { data, error } = await db
      .from("campaigns")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      return res.json(FALLBACK);
    }

    res.json(data);
  } catch {
    res.json(FALLBACK);
  }
}
