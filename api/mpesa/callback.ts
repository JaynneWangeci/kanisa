import { requireDb } from "../_supabase.js";

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      res.status(200).json({ ok: true });
      return;
    }

    const { Body } = req.body;
    if (!Body?.stkCallback) {
      res.status(200).json({ ok: true });
      return;
    }

    const { ResultCode, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;
    const db = requireDb();

    const { data: donations } = await db
      .from("donations")
      .select("*")
      .eq("checkout_request_id", CheckoutRequestID)
      .limit(1);

    if (!donations?.length) {
      res.status(200).json({ ok: true });
      return;
    }

    const donation = donations[0];

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
    } else {
      await db
        .from("donations")
        .update({ status: "failed" })
        .eq("id", donation.id);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("callback error:", err);
    res.status(200).json({ ok: true });
  }
}
