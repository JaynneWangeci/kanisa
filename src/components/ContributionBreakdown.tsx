import { useState, useEffect, useCallback } from "react";
import { Trophy, TrendingUp, Users, Calendar, Medal, ChevronDown, ChevronUp, Receipt } from "lucide-react";

interface BreakdownMember {
  id: string;
  name: string;
  council: string;
  total: number;
  count: number;
  rank: number;
}

interface RecentDonation {
  id: string;
  donor_name: string | null;
  amount: number;
  message: string | null;
  created_at: string;
  member_name: string | null;
}

interface BreakdownData {
  members: BreakdownMember[];
  today_total: number;
  overall_total: number;
  overall_count: number;
  recent: RecentDonation[];
}

function formatKES(n: number): string {
  return `KES ${n.toLocaleString("en-KE")}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function councilBadge(council: string): string {
  const map: Record<string, string> = {
    parish_board: "Parish Board",
    women_council: "Women's Council",
    men_council: "Men's Council",
    development: "Development",
  };
  return map[council] || council;
}

const DEFAULT_DATA: BreakdownData = {
  members: [],
  today_total: 0,
  overall_total: 0,
  overall_count: 0,
  recent: [],
};

export default function ContributionBreakdown() {
  const [data, setData] = useState<BreakdownData>(DEFAULT_DATA);
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const fetchBreakdown = useCallback(async () => {
    try {
      const res = await fetch("/api/contributions/breakdown");
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchBreakdown();
    const interval = setInterval(fetchBreakdown, 10000);
    return () => clearInterval(interval);
  }, [fetchBreakdown]);

  const top5 = data.members.slice(0, 5);
  const rest = data.members.slice(5);
  const displayMembers = showAll ? data.members : top5;

  return (
    <section className="bg-white px-4 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-nobuk-muted px-4 py-1.5 text-xs font-bold text-nobuk uppercase tracking-widest">
            <Trophy size={12} />
            Honour Roll
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold text-nobuk md:text-4xl">
            Contribution Breakdown
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
            See how our community is building the house of worship together.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-nobuk to-nobuk-light p-6 text-white shadow-lg">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp size={18} />
              <span className="text-xs font-bold uppercase tracking-wider opacity-80">Overall Total</span>
            </div>
            <p className="text-3xl font-bold">{formatKES(data.overall_total)}</p>
            <p className="mt-1 text-sm opacity-70">{data.overall_count} donations</p>
          </div>

          <div className="rounded-2xl border border-amber/30 bg-gradient-to-br from-amber-light to-amber/20 p-6 text-nobuk shadow-lg">
            <div className="mb-2 flex items-center gap-2">
              <Calendar size={18} className="text-amber-dark" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-dark">Today</span>
            </div>
            <p className="text-3xl font-bold">{formatKES(data.today_total)}</p>
            <p className="mt-1 text-sm text-muted">collected today</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 text-nobuk shadow-lg">
            <div className="mb-2 flex items-center gap-2">
              <Users size={18} className="text-muted" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Contributors</span>
            </div>
            <p className="text-3xl font-bold">{data.members.length}</p>
            <p className="mt-1 text-sm text-muted">honoured members</p>
          </div>
        </div>

        {/* Live Feed */}
        <div className="mb-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between bg-gray-50 px-6 py-4 text-left transition hover:bg-gray-100"
          >
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-muted" />
              <span className="text-sm font-bold text-nobuk">Recent Donations</span>
              {data.recent.length > 0 && (
                <span className="rounded-full bg-nobuk-muted px-2 py-0.5 text-[10px] font-bold text-nobuk">
                  Live
                </span>
              )}
            </div>
            {expanded ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
          </button>
          {expanded && (
            <div className="divide-y divide-gray-100">
              {data.recent.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-muted">
                  No donations yet. Be the first to give!
                </div>
              ) : (
                data.recent.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-6 py-3 transition hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-nobuk">{d.donor_name || "Anonymous"}</p>
                      <p className="text-xs text-muted">
                        {d.member_name ? `In honour of ${d.member_name}` : "General Fund"}
                        <span className="mx-1">&middot;</span>
                        {timeAgo(d.created_at)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-nobuk">{formatKES(d.amount)}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
            <div className="flex items-center gap-2">
              <Medal size={16} className="text-amber-dark" />
              <span className="text-sm font-bold text-nobuk">Member Honour Roll</span>
              <span className="ml-auto text-xs text-muted">Ranked by total contributions</span>
            </div>
          </div>

          {displayMembers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Trophy size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-muted">No honoured contributions yet</p>
              <p className="mt-1 text-xs text-muted/70">When members are honoured, they'll appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Header */}
              <div className="hidden items-center px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-muted sm:flex">
                <span className="w-10 text-center">#</span>
                <span className="flex-1">Member</span>
                <span className="w-20 text-right">Count</span>
                <span className="w-28 text-right">Total</span>
              </div>

              {displayMembers.map((m, i) => {
                const isTop3 = i < 3;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center px-6 py-4 transition hover:bg-gray-50 ${
                      isTop3 ? "bg-gradient-to-r from-amber-light/30 via-transparent to-transparent" : ""
                    }`}
                  >
                    <div className="flex w-10 items-center justify-center">
                      {isTop3 ? (
                        <span className="text-lg">{["🥇", "🥈", "🥉"][i]}</span>
                      ) : (
                        <span className="text-sm font-bold text-muted">{m.rank}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-nobuk">{m.name}</p>
                      <p className="text-[11px] text-muted">{councilBadge(m.council)}</p>
                    </div>
                    <div className="w-20 text-right">
                      <p className="text-sm font-semibold text-nobuk">{m.count}</p>
                      <p className="text-[10px] text-muted">gifts</p>
                    </div>
                    <div className="w-28 text-right">
                      <p className="text-sm font-bold text-nobuk">{formatKES(m.total)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {data.members.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex w-full items-center justify-center gap-1 border-t border-gray-100 px-6 py-3 text-sm font-semibold text-nobuk transition hover:bg-gray-50"
            >
              {showAll ? (
                <>Show Top 5 <ChevronUp size={16} /></>
              ) : (
                <>Show All ({data.members.length}) <ChevronDown size={16} /></>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
