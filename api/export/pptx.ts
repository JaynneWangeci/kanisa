import { requireDb } from "../_supabase.js";
import { getAdmin, logAudit } from "../_admin.js";
import PptxGenJS from "pptxgenjs";

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

    const { data: donations } = await db
      .from("donations")
      .select("id, donor_name, amount, method, status, receipt_number, message, honored_member_id, created_at, campaign_id")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    await logAudit({
      adminId: admin.id,
      action: "export_ledger",
      resourceType: "donation",
      details: { count: donations?.length, format: "pptx" },
    });

    const goal = Number(campaign?.goal || 5000000);
    const raised = Number(campaign?.raised || 0) + (donations || []).reduce((s, d) => s + Number(d.amount), 0);
    const donors = new Set((donations || []).map((d) => d.donor_name).filter(Boolean));

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name: "WIDE", width: 10, height: 7.5 });
    pptx.layout = "WIDE";

    const titleOpts = { fontSize: 32, bold: true, color: "1B3A2D", fontFace: "Arial" };
    const subtitleOpts = { fontSize: 16, color: "6B7280", fontFace: "Arial" };
    const bodyOpts = { fontSize: 14, color: "374151", fontFace: "Arial" };

    // Slide 1: Title
    const slide1 = pptx.addSlide();
    slide1.background = { color: "F9FAFB" };
    slide1.addText("AIPCA Bahati Cathedral", { x: 0.5, y: 1.5, w: 9, h: 1, ...titleOpts, align: "center" });
    slide1.addText("Harambee Fundraising Report", { x: 0.5, y: 2.5, w: 9, h: 0.8, fontSize: 24, color: "4A7C59", align: "center", fontFace: "Arial" });
    slide1.addText(`Generated: ${new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, {
      x: 0.5, y: 3.6, w: 9, h: 0.5, ...subtitleOpts, align: "center"
    });
    slide1.addText(`Prepared by: ${admin.name} (${admin.email})`, { x: 0.5, y: 4.2, w: 9, h: 0.5, fontSize: 12, color: "9CA3AF", align: "center", fontFace: "Arial" });

    // Slide 2: Summary
    const slide2 = pptx.addSlide();
    slide2.background = { color: "F9FAFB" };
    slide2.addText("Campaign Summary", { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 22, bold: true, color: "1B3A2D", fontFace: "Arial" });

    const summaryData = [
      [{ label: "Campaign", value: campaign?.title || "Development Fund" }, { label: "Goal", value: `KES ${goal.toLocaleString()}` }],
      [{ label: "Total Raised", value: `KES ${raised.toLocaleString()}` }, { label: "Progress", value: `${Math.round((raised / goal) * 100)}%` }],
      [{ label: "Total Donors", value: `${donors.size}` }, { label: "Average Gift", value: donors.size ? `KES ${Math.round(raised / donors.size).toLocaleString()}` : "KES 0" }],
      [{ label: "Completed Donations", value: `${donations?.length || 0}` }, { label: "Status", value: campaign?.is_active ? "Active" : "Inactive" }],
    ];

    const sumTableRows = summaryData.map((row) => [
      { text: row[0].label, options: { fontSize: 12, color: "6B7280", fontFace: "Arial" } },
      { text: row[0].value, options: { fontSize: 13, bold: true, color: "1B3A2D", fontFace: "Arial" } },
      { text: row[1].label, options: { fontSize: 12, color: "6B7280", fontFace: "Arial" } },
      { text: row[1].value, options: { fontSize: 13, bold: true, color: "1B3A2D", fontFace: "Arial" } },
    ]);

    slide2.addTable(sumTableRows, {
      x: 0.5, y: 1.2, w: 9,
      colW: [1.5, 2.5, 1.5, 2.5],
      rowH: [0.5, 0.5, 0.5, 0.5],
      border: { type: "solid", color: "E5E7EB", pt: 0.5 },
      autoPage: false,
    });

    slide2.addText("Committee Members", { x: 0.5, y: 3.8, w: 9, h: 0.5, fontSize: 18, bold: true, color: "1B3A2D", fontFace: "Arial" });

    const { data: members } = await db
      .from("committee_members")
      .select("name, role, council")
      .order("council")
      .order("order");

    const memberRows = (members || []).map((m) => [
      { text: m.name, options: { fontSize: 11, color: "374151", fontFace: "Arial" } },
      { text: m.role, options: { fontSize: 11, color: "6B7280", fontFace: "Arial" } },
      { text: m.council.replace(/_/g, " "), options: { fontSize: 11, color: "6B7280", fontFace: "Arial" } },
    ]);

    const headerRow = [
      { text: "Name", options: { fontSize: 11, bold: true, color: "FFFFFF", fontFace: "Arial", fill: { color: "1B3A2D" } } },
      { text: "Role", options: { fontSize: 11, bold: true, color: "FFFFFF", fontFace: "Arial", fill: { color: "1B3A2D" } } },
      { text: "Council", options: { fontSize: 11, bold: true, color: "FFFFFF", fontFace: "Arial", fill: { color: "1B3A2D" } } },
    ];

    slide2.addTable([headerRow, ...memberRows], {
      x: 0.5, y: 4.3, w: 9,
      colW: [3.5, 3.5, 2],
      rowH: 0.35,
      border: { type: "solid", color: "E5E7EB", pt: 0.5 },
      autoPage: false,
    });

    // Slide 3: Donations Table
    const slide3 = pptx.addSlide();
    slide3.background = { color: "F9FAFB" };
    slide3.addText("Donation Ledger", { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 22, bold: true, color: "1B3A2D", fontFace: "Arial" });

    const donHeader = [
      { text: "Donor", options: { fontSize: 10, bold: true, color: "FFFFFF", fontFace: "Arial", fill: { color: "1B3A2D" } } },
      { text: "Amount", options: { fontSize: 10, bold: true, color: "FFFFFF", fontFace: "Arial", fill: { color: "1B3A2D" } } },
      { text: "Receipt", options: { fontSize: 10, bold: true, color: "FFFFFF", fontFace: "Arial", fill: { color: "1B3A2D" } } },
      { text: "Date", options: { fontSize: 10, bold: true, color: "FFFFFF", fontFace: "Arial", fill: { color: "1B3A2D" } } },
    ];

    const donRows = (donations || []).slice(0, 50).map((d) => [
      { text: d.donor_name || "Anonymous", options: { fontSize: 10, color: "374151", fontFace: "Arial" } },
      { text: `KES ${Number(d.amount).toLocaleString()}`, options: { fontSize: 10, color: "374151", fontFace: "Arial" } },
      { text: d.receipt_number || "—", options: { fontSize: 10, color: "6B7280", fontFace: "Arial" } },
      { text: new Date(d.created_at).toLocaleDateString("en-GB"), options: { fontSize: 10, color: "6B7280", fontFace: "Arial" } },
    ]);

    slide3.addTable([donHeader, ...donRows], {
      x: 0.3, y: 1.1, w: 9.4,
      colW: [3, 2, 2.5, 1.9],
      rowH: 0.3,
      border: { type: "solid", color: "E5E7EB", pt: 0.5 },
      autoPage: false,
    });

    if ((donations?.length || 0) > 50) {
      slide3.addText(`Showing 50 of ${donations.length} donations`, {
        x: 0.5, y: 6.8, w: 9, h: 0.4, fontSize: 10, color: "9CA3AF", align: "center", fontFace: "Arial",
      });
    }

    const buffer = await pptx.write({ outputType: "nodebuffer" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename=harambee-report-${new Date().toISOString().slice(0, 10)}.pptx`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err: any) {
    console.error("pptx export error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}
