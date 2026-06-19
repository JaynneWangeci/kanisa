import { Router } from "express";
import { requireService } from "../lib/supabase.js";

export const mpesaRouter = Router();

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "";
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "";
const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
const TILL_NUMBER = process.env.MPESA_TILL_NUMBER || "835872";
const PASSKEY = process.env.MPESA_PASSKEY || "";
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || "https://yourdomain.com/api/mpesa/callback";
const ENV = process.env.MPESA_ENV || "sandbox";
const TRANSACTION_TYPE = process.env.MPESA_TRANSACTION_TYPE || "CustomerPayBillOnline";

const BASE_URL = ENV === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";

async function getAccessToken() {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await res.json();
  return data.access_token;
}

mpesaRouter.post("/stkpush", async (req, res) => {
  try {
    const { phone, amount, account_reference, transaction_desc, donation_id } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: "phone and amount required" });
    }

    const normalizedPhone = phone.replace(/^0+/, "254").replace(/^\+/, "");
    if (normalizedPhone.length < 10) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    const accessToken = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

    const PartyB = ENV === "sandbox" ? SHORTCODE : (TRANSACTION_TYPE === "CustomerBuyGoodsOnline" ? TILL_NUMBER : SHORTCODE);
    const BusinessShortCode = ENV === "sandbox" ? SHORTCODE : PartyB;

    const payload = {
      BusinessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: TRANSACTION_TYPE,
      Amount: Math.round(Number(amount)),
      PartyA: normalizedPhone,
      PartyB,
      PhoneNumber: normalizedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: account_reference || "Harambee",
      TransactionDesc: transaction_desc || "Harambee Donation",
    };

    const stkRes = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const stkData = await stkRes.json();

    if (stkData.ResponseCode === "0" && donation_id) {
      const db = requireService();
      await db
        .from("donations")
        .update({ checkout_request_id: stkData.CheckoutRequestID })
        .eq("id", donation_id);

      if (ENV === "sandbox") {
        const { data: donation } = await db
          .from("donations")
          .select("id, campaign_id, amount")
          .eq("id", donation_id)
          .single();

        if (donation) {
          await db
            .from("donations")
            .update({
              status: "completed",
              receipt_number: `SANDBOX-${Date.now()}`,
            })
            .eq("id", donation.id);

          await db.rpc("increment_campaign_raised", {
            campaign_id: donation.campaign_id,
            amount: Number(donation.amount),
          });
        }
      }
    }

    res.json(stkData);
  } catch (err: any) {
    console.error("mpesa stkpush error:", err);
    res.status(200).json({
      errorCode: "500",
      errorMessage: err?.message || "M-Pesa request failed",
    });
  }
});

mpesaRouter.post("/callback", async (req, res) => {
  try {
    const { Body } = req.body;
    if (!Body?.stkCallback) return res.status(200).json({ ok: true });

    const { ResultCode, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;

    const db = requireService();
    const { data: donations } = await db
      .from("donations")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .limit(1);

    if (!donations?.length) return res.status(200).json({ ok: true });

    const donation = donations[0];

    if (ENV === "sandbox") {
      return res.status(200).json({ ok: true });
    }

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      let receiptNumber = "";
      for (const item of CallbackMetadata.Item) {
        if (item.Name === "MpesaReceiptNumber") receiptNumber = item.Value;
      }

      await db
        .from("donations")
        .update({
          status: "completed",
          receipt_number: receiptNumber || `TXN-${Date.now()}`,
        })
        .eq("id", donation.id);

      await db.rpc("increment_campaign_raised", {
        campaign_id: donation.campaign_id,
        amount: Number(donation.amount),
      });
    } else {
      await db
        .from("donations")
        .update({ status: "failed" })
        .eq("id", donation.id);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("mpesa callback error:", err);
    res.status(200).json({ ok: true });
  }
});

mpesaRouter.get("/status/:checkoutRequestId", async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    const accessToken = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const statusRes = await fetch(`${BASE_URL}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await statusRes.json();

    if (ENV === "sandbox") {
      const db = requireService();
      const { data: donation } = await db
        .from("donations")
        .select("status, receipt_number")
        .eq("checkout_request_id", checkoutRequestId)
        .single();

      if (donation?.status === "completed") {
        return res.json({ ResultCode: "0", status: "completed", receipt_number: donation.receipt_number });
      }
    }

    res.json(data);
  } catch (err) {
    console.error("mpesa status error:", err);
    res.status(500).json({ error: "Query failed" });
  }
});
