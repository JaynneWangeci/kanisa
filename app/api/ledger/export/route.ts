import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  if (!supabase) {
    return new NextResponse("No data available", { status: 404 });
  }

  const { data: donations } = await supabase
    .from("donations")
    .select("donor_name, amount, method, receipt_number, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (!donations || donations.length === 0) {
    return new NextResponse("No donations yet", { status: 200 });
  }

  const header = "Donor Name,Amount (KES),Method,Receipt Number,Date";
  const rows = donations.map(
    (d) =>
      `"${d.donor_name || "Anonymous"}","${d.amount}","${d.method.toUpperCase()}"${d.receipt_number ? `,"${d.receipt_number}"` : ',""'},${new Date(d.created_at).toISOString().split("T")[0]}`,
  );

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="harambee-ledger.csv"',
    },
  });
}
