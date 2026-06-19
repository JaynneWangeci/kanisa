import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { committeeRouter } from "./routes/committee.js";
import { donationsRouter } from "./routes/donations.js";
import { adminRouter } from "./routes/admin.js";
import { mpesaRouter } from "./routes/mpesa.js";
import { c2bRouter } from "./routes/c2b.js";
import { ledgerRouter } from "./routes/ledger.js";
import { membersRouter } from "./routes/members.js";
import { contributionsRouter } from "./routes/contributions.js";
import { rateLimit } from "./lib/admin.js";

if (!process.env.VERCEL) {
  dotenv.config({ path: ".env.local" });
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/committee", committeeRouter);
app.use("/api/donations", donationsRouter);
app.use("/api/admin", rateLimit, adminRouter);
app.use("/api/mpesa", mpesaRouter);
app.use("/api/c2b", c2bRouter);
app.use("/api/ledger", rateLimit, ledgerRouter);
app.use("/api/members", membersRouter);
app.use("/api/contributions", contributionsRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/debug", (_req, res) => {
  const mask = (s: string) => s ? `${s.slice(0, 4)}...${s.slice(-4)}` : "not set";
  res.json({
    has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_supabase_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    mpesa_env: process.env.MPESA_ENV || "not set",
    mpesa_consumer_key: mask(process.env.MPESA_CONSUMER_KEY),
    mpesa_consumer_secret: mask(process.env.MPESA_CONSUMER_SECRET),
    mpesa_shortcode: process.env.MPESA_SHORTCODE || "not set",
    mpesa_passkey: mask(process.env.MPESA_PASSKEY),
    mpesa_callback_url: process.env.MPESA_CALLBACK_URL || "not set",
  });
});

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
