import { NextRequest, NextResponse } from "next/server";
import { requireServiceSupabase } from "@/lib/supabase";
import { enqueuePayment } from "@/lib/queue";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { amount, donor_name, phone, message, honored_member_id } = body;

  if (!amount || !phone) {
    return NextResponse.json(
      { error: "Amount and phone are required" },
      { status: 400 },
    );
  }

  if (amount < 10 || amount > 150000) {
    return NextResponse.json(
      { error: "Amount must be between KES 10 and KES 150,000" },
      { status: 400 },
    );
  }

  let svc;
  try {
    svc = requireServiceSupabase();
  } catch {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 },
    );
  }

  const phoneHash = crypto
    .createHash("sha256")
    .update(phone.replace(/\s/g, ""))
    .digest("hex");

  const { data: recent } = await svc
    .from("phone_lookup")
    .select("created_at")
    .eq("phone_hash", phoneHash)
    .order("created_at", { ascending: false })
    .limit(1);

  if (recent && recent.length > 0) {
    const lastRequest = new Date(recent[0].created_at).getTime();
    const now = Date.now();
    if (now - lastRequest < 60000) {
      return NextResponse.json(
        { error: "Please wait 60 seconds before another request" },
        { status: 429 },
      );
    }
  }

  const { data: campaign } = await svc
    .from("campaigns")
    .select("id")
    .eq("slug", "development-fund")
    .eq("is_active", true)
    .single();

  if (!campaign) {
    return NextResponse.json(
      { error: "No active campaign found" },
      { status: 404 },
    );
  }

  const { data: donation, error: donationError } = await svc
    .from("donations")
    .insert({
      campaign_id: campaign.id,
      donor_name: donor_name || null,
      amount,
      method: "mpesa",
      status: "pending",
      phone,
      message: message || null,
      honored_member_id: honored_member_id || null,
    })
    .select()
    .single();

  if (donationError || !donation) {
    return NextResponse.json(
      { error: "Failed to create donation record" },
      { status: 500 },
    );
  }

  await svc.from("phone_lookup").insert({
    phone_hash: phoneHash,
    donation_id: donation.id,
  });

  await enqueuePayment(donation.id);

  return NextResponse.json({
    donation_id: donation.id,
    message: "STK push initiated",
  });
}
