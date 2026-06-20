import { Router } from "express";
import { requireService } from "../lib/supabase.js";
import { sendWhatsApp } from "../lib/twilio.js";

export const remindersRouter = Router();

// ── Send pending reminders (callable by cron every hour) ──
remindersRouter.post("/send", async (_req, res) => {
  try {
    const db = requireService();
    const now = new Date().toISOString();

    const { data: due } = await db
      .from("pledges")
      .select("id, donor_name, whatsapp_number, reminder_freq, amount, paid, remaining, created_at")
      .not("whatsapp_number", "is", null)
      .neq("status", "fulfilled");

    const bibleRes = await db.from("bible_verses").select("*");
    const verses = bibleRes.data || [];
    const enVerses = verses.filter(v => v.language === "en");
    const swVerses = verses.filter(v => v.language === "sw");

    let sent = 0;
    for (const pledge of due || []) {
      if (!pledge.whatsapp_number) continue;

      const enVerse = enVerses[Math.floor(Math.random() * enVerses.length)];
      const swVerse = swVerses[Math.floor(Math.random() * swVerses.length)];
      const pct = pledge.amount > 0 ? Math.round((pledge.paid / pledge.amount) * 100) : 0;

      const message = `Hi ${pledge.donor_name}! ⛪\n\nYour pledge reminder:\n• Pledged: KES ${pledge.amount.toLocaleString()}\n• Paid: KES ${pledge.paid.toLocaleString()} (${pct}%)\n• Remaining: KES ${pledge.remaining.toLocaleString()}\n\nEncouragement:\n"${enVerse?.verse}" — ${enVerse?.reference}\n\nHabari ${pledge.donor_name}! ⛪\n\nUkumbusho wa ahadi yako:\n• Umeahidi: KES ${pledge.amount.toLocaleString()}\n• Umalipa: KES ${pledge.paid.toLocaleString()} (${pct}%)\n• Inabaki: KES ${pledge.remaining.toLocaleString()}\n\nNeno la kutia moyo:\n"${swVerse?.verse}" — ${swVerse?.reference}\n\nMungu akubariki! AIPCA Bahati Cathedral`;

      const ok = await sendWhatsApp(pledge.whatsapp_number, message);
      if (ok) sent++;
    }

    res.json({ ok: true, sent, total: due?.length || 0 });
  } catch (err) {
    console.error("reminder send error:", err);
    res.status(500).json({ error: "Failed to send reminders" });
  }
});

// ── Get a random Bible verse ──
remindersRouter.get("/verse", async (req, res) => {
  try {
    const db = requireService();
    const lang = (req.query.lang as string) || "en";
    const { data } = await db
      .from("bible_verses")
      .select("*")
      .eq("language", lang)
      .limit(20);

    const verses = data || [];
    const verse = verses.length ? verses[Math.floor(Math.random() * verses.length)] : null;
    res.json({ verse });
  } catch (err) {
    console.error("verse error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Personal portfolio endpoint ──
remindersRouter.get("/portfolio", async (req, res) => {
  try {
    const db = requireService();
    const q = String(req.query.name || "").trim();
    if (!q) return res.status(400).json({ error: "name required" });

    // Get matching member ids for sub-queries
    const { data: matchingMembers } = await db
      .from("church_members")
      .select("id")
      .ilike("name", `%${q}%`);
    const memberIds = (matchingMembers || []).map(m => m.id);

    const [pledgesRes, donationsByDonor, donationsByMember, donationsByHonour, honouredRes] = await Promise.all([
      db.from("pledges").select("*").ilike("donor_name", `%${q}%`).order("created_at", { ascending: false }),
      // donations where donor_name matches
      db.from("donations").select("id, donor_name, amount, status, receipt_number, phone, created_at").eq("status", "completed").ilike("donor_name", `%${q}%`).order("created_at", { ascending: false }),
      // donations where church_member_id matches (donor's member record)
      memberIds.length ? db.from("donations").select("id, donor_name, amount, status, receipt_number, phone, created_at").eq("status", "completed").in("church_member_id", memberIds).order("created_at", { ascending: false }) : { data: [] },
      // donations where honored_member_id matches (donations in honour of this person)
      memberIds.length ? db.from("donations").select("id, donor_name, amount, status, receipt_number, phone, created_at").eq("status", "completed").in("honored_member_id", memberIds).order("created_at", { ascending: false }) : { data: [] },
      // people who honoured this person (donations where honored_member_id matches)
      memberIds.length ? db.from("donations").select("id, donor_name, amount, phone, created_at").eq("status", "completed").in("honored_member_id", memberIds).order("created_at", { ascending: false }) : { data: [] },
    ]);

    const pledges = pledgesRes.data || [];

    // Merge donations: de-duplicate by id
    const donationMap = new Map();
    for (const d of [...(donationsByDonor.data || []), ...((donationsByMember as any).data || []), ...((donationsByHonour as any).data || [])]) {
      donationMap.set(d.id, d);
    }
    const donations = Array.from(donationMap.values());

    const honoured = honouredRes.data || [];

    const totalDonated = donations.reduce((s: number, d: any) => s + Number(d.amount), 0);
    const honourCount = honoured.length;
    const honourTotal = honoured.reduce((s: number, h: any) => s + Number(h.amount), 0);

    res.json({
      name: q,
      pledges,
      donations,
      honoured,
      stats: {
        total_donated: totalDonated,
        donation_count: donations.length,
        honour_count: honourCount,
        honour_total: honourTotal,
      },
    });
  } catch (err) {
    console.error("portfolio error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
