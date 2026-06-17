import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const checkoutRequestId = request.nextUrl.searchParams.get(
    "checkoutRequestId",
  );

  if (!checkoutRequestId) {
    return NextResponse.json(
      { error: "checkoutRequestId is required" },
      { status: 400 },
    );
  }

  if (!supabase) {
    return NextResponse.json({ status: "pending" });
  }

  const { data, error } = await supabase
    .from("donations")
    .select("status, receipt_number, donor_name, amount")
    .eq("checkout_request_id", checkoutRequestId)
    .single();

  if (error || !data) {
    return NextResponse.json({ status: "pending" });
  }

  return NextResponse.json(data);
}
