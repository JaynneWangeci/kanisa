// ── Async Job Queue ──
// Redis-backed background jobs for heavy operations
// Uses BullMQ for reliable job processing

import { Queue, Worker, Job } from "bullmq";
import { getRedis } from "./redis.js";
import { requireService } from "./supabase.js";

const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL || "";

function getConnection() {
  if (REDIS_URL) return { url: REDIS_URL };
  return { host: "localhost", port: 6379 };
}

// ── Job Queues ──

export const reminderQueue = new Queue("reminders", { connection: getConnection() });
export const exportQueue = new Queue("exports", { connection: getConnection() });
export const mpesaQueue = new Queue("mpesa", { connection: getConnection() });
export const auditQueue = new Queue("audit", { connection: getConnection() });
export const analyticsRefreshQueue = new Queue("analytics-refresh", { connection: getConnection() });

// ── Job Types ──

export type JobType =
  | "send_reminder"
  | "generate_pdf"
  | "generate_ppt"
  | "poll_mpesa_status"
  | "process_mpesa_callback"
  | "refresh_analytics_cache"
  | "batch_audit_write";

// ── Enqueue helpers ──

export async function enqueueReminder(donorName: string, phone: string, amount: number, campaign: string) {
  return reminderQueue.add("send_reminder", { donorName, phone, amount, campaign }, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 86400 },
  });
}

export async function enqueueExport(type: "pdf" | "ppt", adminId: string, filters?: Record<string, unknown>) {
  return exportQueue.add(`generate_${type}`, { type, adminId, filters }, {
    attempts: 2,
    backoff: { type: "fixed", delay: 10000 },
  });
}

export async function enqueueMpesaPoll(checkoutRequestId: string, donationId: string) {
  return mpesaQueue.add("poll_mpesa_status", { checkoutRequestId, donationId }, {
    delay: 15000,
    attempts: 5,
    backoff: { type: "exponential", delay: 10000 },
  });
}

export async function enqueueAnalyticsRefresh() {
  return analyticsRefreshQueue.add("refresh_analytics_cache", {}, {
    delay: 5000,
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 3600 },
  });
}

// ── Worker: Reminders ──

export function startReminderWorker() {
  const worker = new Worker("reminders", async (job: Job) => {
    const { donorName, phone, amount, campaign } = job.data;
    const db = requireService();

    // Fetch Bible verses
    const { data: verses } = await db
      .from("bible_verses")
      .select("text, reference, language")
      .order("random")
      .limit(2);

    if (!verses?.length) return { sent: false, reason: "no_verses" };

    const enVerse = verses.find((v: any) => v.language === "en");
    const swVerse = verses.find((v: any) => v.language === "sw");

    const message = enVerse
      ? `🔹 *AIPCA Bahati Cathedral* 🔹\n\n*Pledge Reminder*\nDear ${donorName},\n\nThis is a reminder of your pledge of KES ${Number(amount).toLocaleString()} for the ${campaign}.\n\n📖 *God's Word:*\n"${enVerse.text}" — ${enVerse.reference}`
      : `🔹 *AIPCA Bahati Cathedral* 🔹\n\n*Pledge Reminder*\nDear ${donorName}, ...`;

    // Call Twilio API
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    if (!twilioAccountSid || !twilioAuthToken) return { sent: false, reason: "twilio_not_configured" };

    const twilio = (await import("twilio")) as any;
    const client = twilio(twilioAccountSid, twilioAuthToken);

    const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
    const from = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

    await client.messages.create({ body: message, from, to });

    // Log reminder in DB
    await db.from("reminder_logs").insert({
      donor_name: donorName,
      phone,
      message,
      status: "sent",
    });

    return { sent: true, donorName };
  }, { connection: getConnection(), concurrency: 5 });

  worker.on("failed", (job, err) => {
    console.error(`Reminder job ${job?.id} failed:`, err.message);
  });

  return worker;
}

// ── Worker: Exports ──

export function startExportWorker() {
  const worker = new Worker("exports", async (job: Job) => {
    const { type, adminId, filters } = job.data;
    // Export generation is handled by the route;
    // this worker ensures it runs in background if needed.
    return { type, adminId, status: "triggered" };
  }, { connection: getConnection() });

  return worker;
}

// ── Worker: Analytics Cache Refresh ──

export function startAnalyticsRefreshWorker() {
  const worker = new Worker("analytics-refresh", async () => {
    const { cacheSet, cacheKey } = await import("./redis.js");
    const db = requireService();

    // Refresh dashboard stats
    const { data: totals } = await db
      .from("donations")
      .select("amount", { count: "exact" })
      .eq("status", "completed");

    const total = (totals || []).reduce((s: number, d: any) => s + Number(d.amount), 0);
    const count = (totals || []).length;
    const avg = count > 0 ? Math.round(total / count) : 0;

    await cacheSet(cacheKey("analytics", "kpi"), { total, count, avg }, 120);
    return { total, count, avg };
  }, { connection: getConnection() });

  return worker;
}

// ── Start all workers ──

let workersStarted = false;

export function startAllWorkers() {
  if (workersStarted) return;
  workersStarted = true;
  startReminderWorker();
  startExportWorker();
  startAnalyticsRefreshWorker();
}

// ── Graceful shutdown ──

export async function stopAllWorkers() {
  await Promise.all([
    reminderQueue.close(),
    exportQueue.close(),
    mpesaQueue.close(),
    auditQueue.close(),
    analyticsRefreshQueue.close(),
  ]);
}
