import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { requireAdmin, logAudit } from "../lib/admin.js";
import { cacheGet, cacheSet, cacheKey, invalidateOnChange } from "../lib/redis.js";

export const contributionsRouter = Router();

contributionsRouter.get("/analytics", requireAdmin, async (req, res) => {
  try {
    const db = requireService();

    // Try Redis cache first
    const cacheKeyStr = cacheKey("analytics", "contributions");
    const cached = await cacheGet<any>(cacheKeyStr);
    if (cached) return res.json(cached);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dailyData, topDonors, councilData, memberRanking, totals] = await Promise.all([
      db.from("donations")
        .select("amount, created_at")
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true }),

      db.from("donations")
        .select("donor_name, amount")
        .eq("status", "completed")
        .not("donor_name", "is", null)
        .order("amount", { ascending: false })
        .limit(20),

      db.from("donations")
        .select("amount, church_members!church_member_id!inner(council)")
        .eq("status", "completed")
        .not("church_member_id", "is", null),

      db.from("donations")
        .select("amount, church_member_id, church_members!church_member_id!inner(name, council)")
        .eq("status", "completed")
        .not("church_member_id", "is", null),

      db.from("donations")
        .select("amount", { count: "exact", head: false })
        .eq("status", "completed"),
    ]);

    const dailyMap: Record<string, number> = {};
    for (const d of dailyData.data || []) {
      const day = (d.created_at as string).slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + Number(d.amount);
    }
    const daily = Object.entries(dailyMap).map(([date, total]) => ({ date, total }));

    const topDonorsList = (topDonors.data || []).map((d: any) => ({
      name: d.donor_name,
      amount: Number(d.amount),
    }));

    const councilMap: Record<string, number> = {};
    for (const d of councilData.data || []) {
      const council = (d as any).church_members?.council || "unknown";
      councilMap[council] = (councilMap[council] || 0) + Number(d.amount);
    }
    const councilBreakdown = Object.entries(councilMap)
      .map(([council, total]) => ({ council, total }))
      .sort((a, b) => b.total - a.total);

    const memberMap: Record<string, { name: string; council: string; total: number; count: number }> = {};
    for (const d of memberRanking.data || []) {
      const member = (d as any).church_members;
      const id = d.church_member_id as string;
      if (!memberMap[id]) {
        memberMap[id] = { name: member?.name || "Unknown", council: member?.council || "", total: 0, count: 0 };
      }
      memberMap[id].total += Number(d.amount);
      memberMap[id].count += 1;
    }
    const memberRankingList = Object.entries(memberMap)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 30);

    const overallTotal = (totals.data || []).reduce((sum: number, d: any) => sum + Number(d.amount), 0);
    const overallCount = (totals.data || []).length;

    const admin = (req as any).admin;
    await logAudit({
      adminId: admin.id,
      action: "view_stats",
      ipAddress: (req as any).adminIp,
    });

    const result = {
      daily,
      top_donors: topDonorsList,
      council_breakdown: councilBreakdown,
      member_ranking: memberRankingList,
      overall_total: overallTotal,
      overall_count: overallCount,
    };

    // Cache for 60 seconds
    await cacheSet(cacheKeyStr, result, 60);

    res.json(result);
  } catch (err) {
    console.error("analytics error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

contributionsRouter.get("/export/ppt", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    if (admin.role === "viewer") return res.status(403).json({ error: "Viewers cannot export" });

    const PptxGenJS = (await import("pptxgenjs")).default;
    const db = requireService();

    const { data: donations } = await db
      .from("donations")
      .select("id, donor_name, amount, method, status, receipt_number, message, created_at, church_members(name, council)")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const total = (donations || []).reduce((s, d) => s + Number(d.amount), 0);
    const count = (donations || []).length;

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";

    const slide1 = pptx.addSlide();
    slide1.background = { fill: "1f2a1d" };
    slide1.addText("AIPCA Bahati Cathedral", { x: 0.5, y: 0.5, w: 9, h: 0.6, fontSize: 14, color: "C4964A", bold: true });
    slide1.addText("Harambee Contribution Report", { x: 0.5, y: 1.2, w: 9, h: 0.8, fontSize: 28, color: "FFFFFF", bold: true });
    slide1.addText(`Generated: ${new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`, { x: 0.5, y: 2.2, w: 9, h: 0.4, fontSize: 12, color: "AAAAAA" });
    slide1.addText(`Total Raised: KES ${total.toLocaleString("en-KE")}`, { x: 0.5, y: 3.0, w: 9, h: 0.5, fontSize: 18, color: "C4964A", bold: true });
    slide1.addText(`Total Donations: ${count}`, { x: 0.5, y: 3.6, w: 9, h: 0.4, fontSize: 14, color: "FFFFFF" });

    const headers = ["Donor", "Amount (KES)", "Method", "Status", "Receipt", "Date"];
    const rows = (donations || []).slice(0, 50).map((d: any) => [
      d.donor_name || "Anonymous",
      `KES ${Number(d.amount).toLocaleString("en-KE")}`,
      d.method || "—",
      d.status || "—",
      d.receipt_number || "—",
      new Date(d.created_at).toLocaleDateString("en-KE"),
    ]);

    const slide2 = pptx.addSlide();
    slide2.background = { fill: "FFFFFF" };
    slide2.addText("Recent Donations (last 50)", { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 16, color: "1f2a1d", bold: true });
    slide2.addTable(rows, {
      x: 0.3, y: 1, w: 9.4,
      colW: [2, 1.5, 1, 1, 1.5, 2],
      fontSize: 9,
      color: "333333",
      border: { type: "solid", color: "CCCCCC", pt: 0.5 },
      headerRow: { fill: { fill: "1f2a1d" }, color: "FFFFFF", bold: true },
      rowH: 0.35,
    });

    const buf = await pptx.write({ outputType: "nodebuffer" });

    await logAudit({
      adminId: admin.id,
      action: "export_ledger",
      details: { type: "ppt", count: donations?.length },
      ipAddress: (req as any).adminIp,
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename=harambee-report-${new Date().toISOString().slice(0, 10)}.pptx`);
    res.send(buf);
  } catch (err) {
    console.error("ppt export error:", err);
    res.status(500).json({ error: "Export failed" });
  }
});

contributionsRouter.get("/export/pdf", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    if (admin.role === "viewer") return res.status(403).json({ error: "Viewers cannot export" });

    const PDFDocument = (await import("pdfkit")).default;
    const db = requireService();

    const { data: donations } = await db
      .from("donations")
      .select("id, donor_name, amount, method, status, receipt_number, message, created_at, honored_member_id, church_members!honored_member_id(name), church_members!church_member_id(name, council)")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const total = (donations || []).reduce((s, d) => s + Number(d.amount), 0);
    const count = (donations || []).length;
    const avg = count > 0 ? Math.round(total / count) : 0;
    const topDonor = (donations || []).reduce((best, d) => Number(d.amount) > Number(best?.amount || 0) ? d : best, null);
    const genDate = new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Group by honoured member
    const honourGroups = new Map<string, { name: string; donations: any[]; total: number }>();
    const ungrouped: any[] = [];
    for (const d of donations || []) {
      const honoured = d.honored_member_id ? (d as any).church_members?.[0]?.name : null;
      if (honoured) {
        if (!honourGroups.has(honoured)) honourGroups.set(honoured, { name: honoured, donations: [], total: 0 });
        const g = honourGroups.get(honoured)!;
        g.donations.push(d);
        g.total += Number(d.amount);
      } else {
        ungrouped.push(d);
      }
    }

    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Title: "Harambee Contribution Report", Author: "AIPCA Bahati Cathedral" } });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", async () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=harambee-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      res.send(pdf);
      await logAudit({
        adminId: admin.id,
        action: "export_ledger",
        details: { type: "pdf", count: donations?.length },
        ipAddress: (req as any).adminIp,
      });
    });

    const pw = doc.page.width - 100;
    const m = 50;
    let pageNum = 0;

    function addFooter() {
      pageNum++;
      doc.fontSize(7).fillColor("#6B7280");
      doc.text(`AIPCA Bahati Cathedral — Harambee Report | Generated ${genDate} | Page ${pageNum}`, m, doc.page.height - 40, { align: "center", width: pw });
      doc.rect(m, doc.page.height - 45, pw, 0.5).fill("#3B82F6");
    }
    doc.on("pageAdded", addFooter);

    // ── Cover Header ──
    doc.rect(m, 30, pw, 4).fill("#1E3A5F");
    doc.rect(m, 34, pw, 1.5).fill("#3B82F6");
    doc.moveDown(3);
    doc.fontSize(24).font("Helvetica-Bold").fillColor("#1E3A5F").text("AIPCA Bahati Cathedral", { align: "center" });
    doc.fontSize(14).fillColor("#3B82F6").text("Harambee Contribution Report", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor("#6B7280").text(`Prepared on ${genDate}`, { align: "center" });
    doc.moveDown(0.5);

    // ── Summary line ──
    const summaryData = [
      { label: "Total Raised", value: `KES ${total.toLocaleString("en-KE")}` },
      { label: "Donations", value: `${count}` },
      { label: "Average", value: `KES ${avg.toLocaleString("en-KE")}` },
      { label: "Top Gift", value: topDonor ? `KES ${Number(topDonor.amount).toLocaleString("en-KE")}` : "—" },
    ];
    const cw = (pw - 30) / 4;
    const cy = doc.y;
    summaryData.forEach((c, i) => {
      const cx = m + i * (cw + 10);
      doc.roundedRect(cx, cy, cw, 40, 4).fill("#EFF6FF").lineWidth(0.5).stroke("#BFDBFE");
      doc.fontSize(6).font("Helvetica").fillColor("#6B7280").text(c.label.toUpperCase(), cx + 6, cy + 6, { width: cw - 12, align: "center" });
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#1E3A5F").text(c.value, cx + 6, cy + 18, { width: cw - 12, align: "center" });
    });
    doc.y = cy + 50;

    function drawTableHeader(ypos: number) {
      doc.fontSize(8).font("Helvetica-Bold").fillColor("FFFFFF");
      const hdrs = ["Donor", "Amount", "Method", "Receipt", "Date"];
      const cws = [pw * 0.24, pw * 0.14, pw * 0.14, pw * 0.22, pw * 0.26];
      let xp = m;
      doc.rect(m, ypos, pw, 14).fill("#1E3A5F");
      hdrs.forEach((h, i) => { doc.text(h, xp + 3, ypos + 3, { width: cws[i], align: i === 1 ? "right" : "left" }); xp += cws[i]; });
      return { y: ypos + 14, widths: cws };
    }

    function checkPage(ypos: number): number {
      if (ypos <= doc.page.height - 60) return ypos;
      doc.addPage();
      const { y: ny } = drawTableHeader(50);
      return ny;
    }

    let { y: curY, widths: colW } = drawTableHeader(doc.y);

    // ── Honour groups ──
    doc.font("Helvetica").fontSize(8).fillColor("#374151");
    for (const [honouredName, group] of honourGroups) {
      curY = checkPage(curY + 2);
      doc.rect(m, curY - 2, pw, 14).fill("#EFF6FF");
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#1E3A5F");
      doc.text(`★ ${honouredName}`, m + 4, curY + 2);
      doc.text(`Total: KES ${group.total.toLocaleString("en-KE")}`, m + pw - 80, curY + 2, { width: 80, align: "right" });
      curY += 14;
      for (const d of (group.donations || []).slice(0, 10)) {
        curY = checkPage(curY + 2);
        const vals = [
          (d.donor_name || "Anonymous").slice(0, 20),
          `${Number(d.amount).toLocaleString("en-KE")}`,
          d.method || "—",
          (d.receipt_number || "—").slice(0, 12),
          new Date(d.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" }),
        ];
        const bg = curY % 2 === 0 ? "#FFFFFF" : "#F9FAFB";
        doc.rect(m, curY - 1, pw, 13).fill(bg);
        doc.font("Helvetica").fontSize(7).fillColor("#6B7280");
        let xp = m;
        vals.forEach((v, i) => { doc.text(v, xp + 3, curY, { width: colW[i], align: i === 1 ? "right" : "left" }); xp += colW[i]; });
        curY += 13;
      }
    }

    // ── Ungrouped / general donations ──
    if (ungrouped.length) {
      curY = checkPage(curY + 2);
      doc.rect(m, curY - 2, pw, 14).fill("#F3F4F6");
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#374151");
      doc.text(`General Harambee Fund`, m + 4, curY + 2);
      curY += 14;
      for (const d of ungrouped.slice(0, 50)) {
        curY = checkPage(curY + 2);
        const vals = [
          (d.donor_name || "Anonymous").slice(0, 20),
          `${Number(d.amount).toLocaleString("en-KE")}`,
          d.method || "—",
          (d.receipt_number || "—").slice(0, 12),
          new Date(d.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" }),
        ];
        const bg = curY % 2 === 0 ? "#FFFFFF" : "#F9FAFB";
        doc.rect(m, curY - 1, pw, 13).fill(bg);
        doc.font("Helvetica").fontSize(7).fillColor("#6B7280");
        let xp = m;
        vals.forEach((v, i) => { doc.text(v, xp + 3, curY, { width: colW[i], align: i === 1 ? "right" : "left" }); xp += colW[i]; });
        curY += 13;
      }
    }

    // ── Bottom summary ──
    curY = checkPage(curY + 10);
    doc.rect(m, curY, pw, 0.5).fill("#3B82F6");
    curY += 10;
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#1E3A5F").text("Report Summary", { align: "center" });
    curY += 14;
    doc.fontSize(8).font("Helvetica").fillColor("#6B7280");
    const summaryLines = [
      `Total donations: ${count}`,
      `Total amount raised: KES ${total.toLocaleString("en-KE")}`,
      `Average contribution: KES ${avg.toLocaleString("en-KE")}`,
    ];
    if (topDonor?.donor_name) summaryLines.push(`Highest: KES ${Number(topDonor.amount).toLocaleString("en-KE")} by ${topDonor.donor_name}`);
    summaryLines.forEach(l => { doc.text(l, m, curY, { align: "center" }); curY += 12; });
    curY += 6;
    doc.fontSize(7).fillColor("#9CA3AF").text("— End of Report —", { align: "center" });
    doc.end();
  } catch (err) {
    console.error("pdf export error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Export failed" });
  }
});

contributionsRouter.get("/export/xlsx", requireAdmin, async (req, res) => {
  try {
    const admin = (req as any).admin;
    if (admin.role === "viewer") return res.status(403).json({ error: "Viewers cannot export" });

    const ExcelJS = (await import("exceljs")).default;
    const db = requireService();

    const { data: donations } = await db
      .from("donations")
      .select("id, donor_name, amount, method, status, receipt_number, phone, message, created_at, honored_member_id, church_member_id, church_members!church_member_id(name, council), honoured:church_members!honored_member_id(name)")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    const { data: allDonations } = await db
      .from("donations")
      .select("id, donor_name, amount, method, status, receipt_number, phone, message, created_at, honored_member_id, church_member_id, church_members!church_member_id(name, council), honoured:church_members!honored_member_id(name)")
      .order("created_at", { ascending: false });

    const { data: pledges } = await db
      .from("pledges")
      .select("*")
      .order("amount", { ascending: false });

    const { data: memberData } = await db
      .from("church_members")
      .select("*")
      .eq("is_active", true)
      .order("name");

    const { data: councilData } = await db
      .from("councils")
      .select("*")
      .eq("is_active", true);

    const wb = new ExcelJS.Workbook();
    wb.creator = "AIPCA Bahati Cathedral";
    wb.created = new Date();
    const gold = "C4964A";
    const dark = "1E3A5F";
    const gray = "F3F4F6";

    function styleHeader(ws: ExcelJS.Worksheet, row: ExcelJS.Row) {
      row.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: dark.replace("#", "") } };
      row.alignment = { vertical: "middle", horizontal: "center" };
      row.height = 22;
    }

    function autoCols(ws: ExcelJS.Worksheet, widths: number[]) {
      ws.columns = widths.map((w, i) => ({ key: i.toString(), width: w }));
    }

    // ── Sheet 1: Summary ──
    const sheet1 = wb.addWorksheet("Summary");

    const completed = donations || [];
    const totalRaised = completed.reduce((s, d) => s + Number(d.amount), 0);
    const donationCount = completed.length;
    const avgGift = donationCount > 0 ? Math.round(totalRaised / donationCount) : 0;
    const totalPledges = (pledges || []).reduce((s, p) => s + Number(p.amount), 0);
    const paidPledges = (pledges || []).reduce((s, p) => s + Number(p.paid), 0);
    const memberCount = (memberData || []).length;
    const allDonationsList = allDonations || [];
    const pendingCount = allDonationsList.filter(d => d.status === "pending").length;
    const failedCount = allDonationsList.filter(d => d.status === "failed").length;

    sheet1.mergeCells("A1:F1");
    const titleRow = sheet1.getRow(1);
    titleRow.getCell(1).value = "AIPCA Bahati Cathedral — Harambee Development Fund";
    titleRow.font = { bold: true, size: 16, color: { argb: dark.replace("#", "") } };
    titleRow.alignment = { horizontal: "center" };
    titleRow.height = 30;

    sheet1.mergeCells("A2:F2");
    const subRow = sheet1.getRow(2);
    subRow.getCell(1).value = `Report Generated: ${new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
    subRow.font = { italic: true, size: 10, color: { argb: "6B7280" } };
    subRow.alignment = { horizontal: "center" };

    const summaryData = [
      ["Total Raised (Completed)", `KES ${totalRaised.toLocaleString("en-KE")}`, "Total Donations", donationCount.toString()],
      ["Average Gift", `KES ${avgGift.toLocaleString("en-KE")}`, "Pending Transactions", pendingCount.toString()],
      ["Total Pledged", `KES ${totalPledges.toLocaleString("en-KE")}`, "Pledge Fulfillment", `${totalPledges > 0 ? ((paidPledges / totalPledges) * 100).toFixed(1) : "0.0"}%`],
      ["Total Church Members", memberCount.toString(), "Failed Transactions", failedCount.toString()],
    ];

    autoCols(sheet1, [28, 28, 28, 28, 28, 28]);
    let sr = 4;
    sheet1.getRow(sr).values = ["Metric", "Value", "Metric", "Value", "", ""];
    styleHeader(sheet1, sheet1.getRow(sr));
    sr++;

    for (const row of summaryData) {
      const r = sheet1.getRow(sr);
      r.values = [...row, "", ""];
      r.getCell(1).font = { bold: true };
      r.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "EFF6FF" } };
      r.getCell(3).font = { bold: true };
      r.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7ED" } };
      sr++;
    }

    // ── Sheet 2: Donations ──
    const sheet2 = wb.addWorksheet("Donations");
    autoCols(sheet2, [4, 24, 14, 10, 10, 18, 16, 22, 16, 16, 16]);
    sheet2.getRow(1).values = ["#", "Donor Name", "Amount (KES)", "Method", "Status", "Receipt Number", "Phone", "Message", "Church Member", "Fellowship", "Date"];
    styleHeader(sheet2, sheet2.getRow(1));

    allDonationsList.forEach((d, i) => {
      const r = sheet2.getRow(i + 2);
      const member = (d as any).church_members;
      r.values = [
        i + 1,
        d.donor_name || "—",
        Number(d.amount),
        d.method || "—",
        d.status || "—",
        d.receipt_number || "—",
        d.phone || "—",
        d.message || "—",
        member?.name || "—",
        member?.council || "—",
        d.created_at ? new Date(d.created_at).toLocaleDateString("en-KE") : "—",
      ];
      r.getCell(3).numFmt = '#,##0';
      if (d.status === "completed") r.getCell(4).font = { color: { argb: "059669" } };
      else if (d.status === "failed") r.getCell(4).font = { color: { argb: "DC2626" } };
      if (i % 2 === 0) r.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } }; });
    });

    // ── Sheet 3: Honour Donations ──
    const sheet3 = wb.addWorksheet("Honour Donations");
    autoCols(sheet3, [4, 22, 22, 14, 16, 16]);
    sheet3.getRow(1).values = ["#", "Honoured Member", "Donor Name", "Amount (KES)", "Receipt", "Date"];
    styleHeader(sheet3, sheet3.getRow(1));

    const honourDonations = allDonationsList.filter(d => d.honored_member_id);
    honourDonations.forEach((d, i) => {
      const r = sheet3.getRow(i + 2);
      const honouredName = (d as any).honoured?.name || "—";
      r.values = [
        i + 1,
        honouredName,
        d.donor_name || "—",
        Number(d.amount),
        d.receipt_number || "—",
        d.created_at ? new Date(d.created_at).toLocaleDateString("en-KE") : "—",
      ];
      r.getCell(4).numFmt = '#,##0';
      if (i % 2 === 0) r.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FEF3C7" } }; });
    });

    // ── Sheet 4: Pledges ──
    const sheet4 = wb.addWorksheet("Pledges");
    autoCols(sheet4, [4, 24, 14, 14, 14, 12, 14, 16]);
    sheet4.getRow(1).values = ["#", "Donor Name", "Amount (KES)", "Paid (KES)", "Remaining (KES)", "Status", "Frequency", "Date"];
    styleHeader(sheet4, sheet4.getRow(1));

    (pledges || []).forEach((p, i) => {
      const r = sheet4.getRow(i + 2);
      r.values = [
        i + 1,
        p.donor_name || "—",
        Number(p.amount),
        Number(p.paid),
        Number(p.remaining),
        p.status || "—",
        p.reminder_freq || "—",
        p.created_at ? new Date(p.created_at).toLocaleDateString("en-KE") : "—",
      ];
      r.getCell(3).numFmt = '#,##0';
      r.getCell(4).numFmt = '#,##0';
      r.getCell(5).numFmt = '#,##0';
      if (p.status === "fulfilled") r.getCell(6).font = { color: { argb: "059669" }, bold: true };
      if (i % 2 === 0) r.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } }; });
    });

    // ── Sheet 5: Members ──
    const sheet5 = wb.addWorksheet("Members");
    autoCols(sheet5, [4, 24, 16, 14, 14, 16]);
    sheet5.getRow(1).values = ["#", "Name", "Fellowship", "Total Donated (KES)", "Donation Count", "Registered"];
    styleHeader(sheet5, sheet5.getRow(1));

    const memberDonationMap: Record<string, { total: number; count: number }> = {};
    for (const d of completed) {
      const member = (d as any).church_members;
      const name = member?.name || d.donor_name;
      if (name && d.church_member_id) {
        if (!memberDonationMap[d.church_member_id]) memberDonationMap[d.church_member_id] = { total: 0, count: 0 };
        memberDonationMap[d.church_member_id].total += Number(d.amount);
        memberDonationMap[d.church_member_id].count += 1;
      }
    }

    const rankedMembers = (memberData || [])
      .map(m => ({
        ...m,
        donated: memberDonationMap[m.id]?.total || 0,
        donationCount: memberDonationMap[m.id]?.count || 0,
      }))
      .sort((a, b) => b.donated - a.donated);

    rankedMembers.forEach((m, i) => {
      const r = sheet5.getRow(i + 2);
      r.values = [i + 1, m.name, m.council || "—", m.donated, m.donationCount, m.created_at ? new Date(m.created_at).toLocaleDateString("en-KE") : "—"];
      r.getCell(4).numFmt = '#,##0';
      if (i % 2 === 0) r.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } }; });
    });

    // ── Sheet 6: Fellowship Breakdown ──
    const sheet6 = wb.addWorksheet("Fellowship Breakdown");
    autoCols(sheet6, [4, 24, 16, 16, 16]);
    sheet6.getRow(1).values = ["#", "Fellowship", "Total Raised (KES)", "Donation Count", "Members"];
    styleHeader(sheet6, sheet6.getRow(1));

    const councilDonationMap: Record<string, { total: number; count: number }> = {};
    for (const d of completed) {
      const member = (d as any).church_members;
      const council = member?.council || "Unassigned";
      if (!councilDonationMap[council]) councilDonationMap[council] = { total: 0, count: 0 };
      councilDonationMap[council].total += Number(d.amount);
      councilDonationMap[council].count += 1;
    }

    const councilMemberCount: Record<string, number> = {};
    for (const m of memberData || []) {
      const council = m.council || "Unassigned";
      councilMemberCount[council] = (councilMemberCount[council] || 0) + 1;
    }

    const allCouncils = new Set([...Object.keys(councilDonationMap), ...Object.keys(councilMemberCount), ...(councilData || []).map(c => c.slug)]);
    Array.from(allCouncils).sort().forEach((council, i) => {
      const r = sheet6.getRow(i + 2);
      r.values = [i + 1, council, councilDonationMap[council]?.total || 0, councilDonationMap[council]?.count || 0, councilMemberCount[council] || 0];
      r.getCell(3).numFmt = '#,##0';
      if (i % 2 === 0) r.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9FAFB" } }; });
    });

    // Freeze panes on data sheets
    [sheet2, sheet3, sheet4, sheet5, sheet6].forEach(s => { s.views = [{ state: "frozen", ySplit: 1 }]; });

    const buf = await wb.xlsx.writeBuffer();

    await logAudit({
      adminId: admin.id,
      action: "export_ledger",
      details: { type: "xlsx", count: completed.length },
      ipAddress: (req as any).adminIp,
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=harambee-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error("xlsx export error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Export failed" });
  }
});
