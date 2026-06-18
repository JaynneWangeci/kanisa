import { requireDb } from "../_supabase.js";
import { getAccessToken, getTimestamp, getPassword } from "../_mpesa.js";

const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || "";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { phone, amount, account_reference, transaction_desc, donation_id } = req.body;

    if (!phone || !amount) {
      res.status(400).json({ error: "phone and amount required" });
      return;
    }

    const normalizedPhone = phone.replace(/^0+/, "254").replace(/^\+/, "");
    if (normalizedPhone.length < 10) {
      res.status(400).json({ error: "Invalid phone number" });
      return;
    }

    const accessToken = await getAccessToken();
    const timestamp = getTimestamp();
    const password = getPassword(timestamp);

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(Number(amount)),
      PartyA: normalizedPhone,
      PartyB: SHORTCODE,
      PhoneNumber: normalizedPhone,
      CallBackURL: CALLBACK_URL,
      AccountReference: account_reference || "Harambee",
      TransactionDesc: transaction_desc || "Harambee Donation",
    };

    const stkRes = await fetch(
      `${process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const stkData = await stkRes.json();

    if (stkData.ResponseCode === "0" && donation_id) {
      try {
        const db = requireDb();
        await db
          .from("donations")
          .update({ checkout_request_id: stkData.CheckoutRequestID })
          .eq("id", donation_id);
      } catch {}
    }

    res.json(stkData);
  } catch (err: any) {
    console.error("stkpush error:", err);
    res.status(500).json({ error: err.message || "M-Pesa request failed" });
  }
}
