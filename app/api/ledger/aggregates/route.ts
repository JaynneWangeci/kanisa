import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  if (!supabase) {
    return NextResponse.json({
      goal: 5000000,
      total_raised: 842500,
      total_donors: 0,
      avg_gift: 0,
      mpesa_split: 0,
      bank_split: 0,
      recent_donations: [],
    });
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("goal, raised")
    .eq("slug", "development-fund")
    .single();

  const { data: stats } = await supabase
    .from("donations")
    .select("amount, method, donor_name, created_at", { count: "exact" })
    .eq("status", "completed");

  const totalDonors = stats?.length || 0;
  const totalRaised = stats?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
  const avgGift = totalDonors > 0 ? Math.round(totalRaised / totalDonors) : 0;
  const mpesaSplit = stats?.filter((d) => d.method === "mpesa").length || 0;

  const { data: recentDonations } = await supabase
    .from("donations")
    .select("donor_name, amount, created_at, method")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    goal: campaign?.goal || 5000000,
    total_raised: totalRaised,
    total_donors: totalDonors,
    avg_gift: avgGift,
    mpesa_split: mpesaSplit,
    bank_split: 0,
    recent_donations: recentDonations || [],
  });
}
