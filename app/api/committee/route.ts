import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  if (!supabase) {
    const fallback = [
      { id: "1", name: "Dadson Mbogo", role: "Parish Board Chairman", council: "parish_board", photo_url: null, order: 1 },
      { id: "2", name: "Jeremiah Kimani", role: "Vice Chairman", council: "parish_board", photo_url: null, order: 2 },
      { id: "3", name: "Kariuki Nderitu", role: "General Secretary", council: "parish_board", photo_url: null, order: 3 },
      { id: "4", name: "Joseph Kamande", role: "Vice General Secretary", council: "parish_board", photo_url: null, order: 4 },
      { id: "5", name: "Johnson Kamau", role: "Treasurer", council: "parish_board", photo_url: null, order: 5 },
      { id: "6", name: "George Kibia", role: "Vice Treasurer", council: "parish_board", photo_url: null, order: 6 },
      { id: "7", name: "Magdalene Wageni", role: "Chairlady", council: "women_council", photo_url: null, order: 7 },
      { id: "8", name: "Alice Kuhunya", role: "Vice Chairlady", council: "women_council", photo_url: null, order: 8 },
      { id: "9", name: "Tiffany Kimani", role: "Secretary", council: "women_council", photo_url: null, order: 9 },
      { id: "10", name: "Esther Mbugua", role: "Treasurer", council: "women_council", photo_url: null, order: 10 },
      { id: "11", name: "Gilbert Wachira", role: "Chairman", council: "men_council", photo_url: null, order: 11 },
      { id: "12", name: "Sam Ndiang'ui", role: "Chairman", council: "development", photo_url: null, order: 12 },
      { id: "13", name: "Wilson Thirikwa", role: "Secretary", council: "development", photo_url: null, order: 13 },
      { id: "14", name: "Maria Goretti Njenga", role: "Treasurer", council: "development", photo_url: null, order: 14 },
    ];
    return NextResponse.json(fallback);
  }

  const { data, error } = await supabase
    .from("committee_members")
    .select("*")
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
  });
}
