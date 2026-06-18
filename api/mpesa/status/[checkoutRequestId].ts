import { getAccessToken, getTimestamp, getPassword } from "../../_mpesa.js";

const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { checkoutRequestId } = req.query;
    const accessToken = await getAccessToken();
    const timestamp = getTimestamp();
    const password = getPassword(timestamp);

    const payload = {
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const statusRes = await fetch(
      `${process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke"}/mpesa/stkpushquery/v1/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await statusRes.json();

    if (data.ResultCode === "0" && data.CheckoutRequestID) {
      try {
        const { requireDb } = await import("../../_supabase.js");
        const db = requireDb();
        const { data: donations } = await db
          .from("donations")
          .select("status, receipt_number")
          .eq("checkout_request_id", checkoutRequestId)
          .limit(1);

        if (donations?.length) {
          data.status = donations[0].status;
          data.receipt_number = donations[0].receipt_number;
        }
      } catch {}
    }

    res.json(data);
  } catch (err: any) {
    console.error("status error:", err);
    res.status(500).json({ error: err.message || "Query failed" });
  }
}
