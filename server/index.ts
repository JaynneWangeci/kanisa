import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { campaignsRouter } from "./routes/campaigns.js";
import { committeeRouter } from "./routes/committee.js";
import { donationsRouter } from "./routes/donations.js";
import { adminRouter } from "./routes/admin.js";
import { mpesaRouter } from "./routes/mpesa.js";
import { ledgerRouter } from "./routes/ledger.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/committee", committeeRouter);
app.use("/api/donations", donationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/mpesa", mpesaRouter);
app.use("/api/ledger", ledgerRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
