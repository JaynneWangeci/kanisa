import { requireDb } from "../_supabase.js";
import { getAdmin, logAudit } from "../_admin.js";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle,
} from "docx";

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
      details: { count: donations?.length, format: "docx" },
    });

    const goal = Number(campaign?.goal || 5000000);
    const raised = Number(campaign?.raised || 0) + (donations || []).reduce((s: number, d: any) => s + Number(d.amount), 0);
    const donors = new Set((donations || []).map((d: any) => d.donor_name).filter(Boolean));
    const progress = Math.round((raised / goal) * 100);

    const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };

    const doc = new Document({
      title: "Harambee Report",
      description: "AIPCA Bahati Cathedral Harambee Fundraising Report",
      styles: { default: { document: { run: { font: "Arial", size: 22, color: "333333" } } } },
      sections: [
        {
          children: [
            new Paragraph({
              text: "AIPCA Bahati Cathedral",
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              text: "Harambee Fundraising Report",
              heading: HeadingLevel.HEADING_1,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              spacing: { after: 200 },
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `Generated: ${new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, size: 20, color: "666666" }),
                new TextRun({ text: `\nPrepared by: ${admin.name} (${admin.email})`, size: 20, color: "999999" }),
              ],
            }),
            new Paragraph({ spacing: { before: 400 } }),
            new Paragraph({ text: "Campaign Summary", heading: HeadingLevel.HEADING_2 }),
            new Table({
              rows: [
                new TableRow({ children: [cell("Campaign", true), cell(campaign?.title || "Development Fund", false), cell("Goal", true), cell(`KES ${goal.toLocaleString()}`, false)] }),
                new TableRow({ children: [cell("Total Raised", true), cell(`KES ${raised.toLocaleString()}`, false), cell("Progress", true), cell(`${progress}%`, false)] }),
                new TableRow({ children: [cell("Total Donors", true), cell(`${donors.size}`, false), cell("Avg Gift", true), cell(`KES ${donors.size ? Math.round(raised / donors.size).toLocaleString() : "0"}`, false)] }),
                new TableRow({ children: [cell("Completed Donations", true), cell(`${donations?.length || 0}`, false), cell("Status", true), cell(campaign?.is_active ? "Active" : "Inactive", false)] }),
              ],
            }),
            new Paragraph({ spacing: { before: 400 } }),
            new Paragraph({ text: "Donation Ledger", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ spacing: { before: 100 } }),
            new Table({
              rows: [
                new TableRow({
                  tableHeader: true,
                  children: [
                    headerCell("Donor"),
                    headerCell("Amount"),
                    headerCell("Receipt"),
                    headerCell("Date"),
                  ],
                }),
                ...(donations || []).slice(0, 100).map((d: any) =>
                  new TableRow({
                    children: [
                      cell(d.donor_name || "Anonymous", false),
                      cell(`KES ${Number(d.amount).toLocaleString()}`, false),
                      cell(d.receipt_number || "—", false),
                      cell(new Date(d.created_at).toLocaleDateString("en-GB"), false),
                    ],
                  })
                ),
              ],
            }),
            ...((donations?.length || 0) > 100
              ? [new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: `Showing 100 of ${donations.length} donations`, size: 18, color: "999999" })] })]
              : []),
            new Paragraph({ spacing: { before: 400 } }),
            new Paragraph({ text: "Committee Members", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ spacing: { before: 100 } }),
            new Table({
              rows: [
                new TableRow({
                  tableHeader: true,
                  children: [headerCell("Name"), headerCell("Role"), headerCell("Council")],
                }),
              ],
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename=harambee-report-${new Date().toISOString().slice(0, 10)}.docx`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err: any) {
    console.error("docx export error:", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
}

function cell(text: string, bold: boolean) {
  return new TableCell({
    width: { size: bold ? 2000 : 3000, type: WidthType.DXA },
    borders: { top: borderStyle(), bottom: borderStyle(), left: borderStyle(), right: borderStyle() },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 20 })],
        spacing: { before: 60, after: 60 },
      }),
    ],
  });
}

function headerCell(text: string) {
  return new TableCell({
    width: { size: 2500, type: WidthType.DXA },
    borders: { top: borderStyle(), bottom: borderStyle(), left: borderStyle(), right: borderStyle() },
    shading: { fill: "1B3A2D" },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20, color: "FFFFFF" })],
        spacing: { before: 60, after: 60 },
      }),
    ],
  });
}

function borderStyle() {
  return { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
}
