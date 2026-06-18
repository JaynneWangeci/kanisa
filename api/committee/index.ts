import { requireDb } from "../_supabase.js";
import { getAdmin, logAudit } from "../_admin.js";

const fallback = [
  { id: "1", name: "Dadson Mbogo", role: "Parish board chairman", council: "parish_board" },
  { id: "2", name: "Jeremiah Kimani", role: "V Chairman", council: "parish_board" },
  { id: "3", name: "Kariuki Nderitu", role: "General Secretary", council: "parish_board" },
  { id: "4", name: "Joseph Kamande", role: "Vice General Secretary", council: "parish_board" },
  { id: "5", name: "Johnson Kamau", role: "Treasurer", council: "parish_board" },
  { id: "6", name: "George Kibia", role: "Vice Treasurer", council: "parish_board" },
  { id: "7", name: "Magdalene Wageni", role: "Chairlady", council: "women_council" },
  { id: "8", name: "Alice Kuhunya", role: "V Chairlady", council: "women_council" },
  { id: "9", name: "Tiffany Kimani", role: "Women council Secretary", council: "women_council" },
  { id: "10", name: "Esther Mbugua", role: "Women council Treasurer", council: "women_council" },
  { id: "11", name: "Gilbert Wachira", role: "Men council chairman", council: "men_council" },
  { id: "12", name: "Sam Ndiang'ui", role: "Development chairman", council: "development" },
  { id: "13", name: "Wilson Thirikwa", role: "Development Secretary", council: "development" },
  { id: "14", name: "Maria goretti Njenga", role: "Development Treasurer", council: "development" },
];

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

    if (!db) {
      res.json({ members: fallback });
      return;
    }

    const { data, error } = await db
      .from("committee_members")
      .select("*")
      .eq("is_active", true)
      .order("order", { ascending: true });

    if (error || !data?.length) {
      res.json({ members: fallback });
      return;
    }

    res.json({ members: data });
  } catch {
    res.json({ members: fallback });
  }
}

async function handlePost(req: any, res: any) {
  const admin = getAdmin(req);
  if (!admin) return res.status(401).json({ error: "Missing or invalid token" });
  if (admin.role === "viewer") return res.status(403).json({ error: "Insufficient permissions" });

  try {
    const db = requireDb();
    const { name, role, council, photo_url, order } = req.body;
    if (!name || !role || !council) return res.status(400).json({ error: "name, role, council required" });

    const { data, error } = await db
      .from("committee_members")
      .insert({ name, role, council, photo_url, order: order || 0 })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await logAudit({
      adminId: admin.id,
      action: "create_committee",
      resourceType: "committee_member",
      resourceId: data.id,
    });

    res.status(201).json({ member: data });
  } catch (err: any) {
    console.error("committee create error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}
