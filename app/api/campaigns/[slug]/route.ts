import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!supabase) {
    return NextResponse.json(
      { raised: 842500, goal: 5000000, recent_donations: [] },
    );
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("slug", slug)
    .single();

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { data: recentDonations } = await supabase
    .from("donations")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json(
    { ...campaign, recent_donations: recentDonations || [] },
    { headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=60" } },
  );
}
