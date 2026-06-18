import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Users, DollarSign, Clock, AlertCircle,
  Download, LogOut, RefreshCw, Shield,
} from "lucide-react";
import type { DashboardStats, AdminUser } from "../types";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const token = localStorage.getItem("token");

  const checkAuth = useCallback(async () => {
    if (!token) { navigate("/admin/login"); return; }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { navigate("/admin/login"); return; }
      const data = await res.json();
      setAdmin(data.admin);
    } catch { navigate("/admin/login"); }
  }, [token, navigate]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchLogs = useCallback(async () => {
    if (admin?.role !== "super_admin") return;
    try {
      const res = await fetch("/api/admin/audit-logs?limit=20");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch { /* silent */ }
  }, [admin?.role]);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => {
    if (!admin) return;
    setLoading(false);
    fetchStats();
    fetchLogs();
  }, [admin, fetchStats, fetchLogs]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    if (exportOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [exportOpen]);

  async function downloadExport(format: string) {
    const token = localStorage.getItem("token");
    const url = format === "csv" ? "/api/ledger/export" : `/api/export/${format}`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `harambee-report.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {}
    setExportOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    navigate("/admin/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nobuk border-t-transparent" />
      </div>
    );
  }

  if (!admin) return null;

  const progress = stats ? Math.min(Math.round((stats.raised / stats.goal) * 100), 100) : 0;

  const statCards = [
    { icon: TrendingUp, label: "Total Raised", value: stats ? `KES ${stats.total_raised.toLocaleString()}` : "—" },
    { icon: Users, label: "Total Donors", value: stats?.total_donors?.toLocaleString() || "0" },
    { icon: DollarSign, label: "Average Gift", value: stats ? `KES ${stats.avg_gift.toLocaleString()}` : "—" },
    { icon: Clock, label: "Pending", value: stats?.pending_count?.toString() || "0" },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-nobuk">Admin Dashboard</h1>
            <p className="text-xs text-muted">{admin.name} &middot; {admin.role.replace("_", " ")}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchStats} className="rounded-lg p-2 text-muted transition hover:bg-cream" title="Refresh">
              <RefreshCw size={16} />
            </button>
            <a href="/" className="text-sm text-muted underline underline-offset-2 hover:text-nobuk">View Site</a>
            <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-muted transition hover:bg-cream">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted">Fundraising Progress</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                KES {stats?.raised?.toLocaleString() || "0"}
                <span className="text-base font-normal text-muted"> / KES {(stats?.goal || 0).toLocaleString()}</span>
              </p>
            </div>
            <div className="text-right"><p className="text-3xl font-bold text-nobuk">{progress}%</p></div>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-nobuk-muted">
            <div className="h-full rounded-full bg-nobuk transition-all duration-1000" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-nobuk-muted">
                  <Icon size={17} className="text-nobuk" />
                </div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted">{s.label}</p>
                <p className="mt-1 text-xl font-bold text-ink">{s.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Recent Donations</h2>
              <div className="relative" ref={exportRef}>
                <button onClick={() => setExportOpen(!exportOpen)} className="flex items-center gap-1 text-xs text-muted hover:text-nobuk">
                  <Download size={12} /> Export
                </button>
                {exportOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                    <button onClick={() => downloadExport("csv")} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-cream">
                      <Download size={14} /> CSV
                    </button>
                    <button onClick={() => downloadExport("pptx")} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-cream">
                      <Download size={14} /> PowerPoint
                    </button>
                    <button onClick={() => downloadExport("docx")} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-cream">
                      <Download size={14} /> Word
                    </button>
                  </div>
                )}
              </div>
            </div>
            {stats?.recent_donations?.length ? (
              <div className="space-y-2">
                {stats.recent_donations.slice(0, 10).map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-ink">{d.donor_name || "Anonymous"}</p>
                      <p className="text-xs text-muted">{new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink tabular-nums">KES {d.amount.toLocaleString()}</p>
                      <span className={`text-xs ${d.status === "completed" ? "text-green-600" : d.status === "pending" ? "text-amber-600" : "text-red-600"}`}>{d.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted">No donations yet</p>}
          </div>

          {admin.role === "super_admin" && (
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Shield size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Audit Log</h2>
              </div>
              {logs.length ? (
                <div className="space-y-1.5">
                  {(logs as { id: string; action: string; admin_name: string; created_at: string }[]).map((log) => (
                    <div key={log.id} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{log.admin_name}</p>
                        <p className="truncate text-xs text-muted">{log.action.replace(/_/g, " ")}</p>
                      </div>
                      <p className="ml-2 shrink-0 text-xs text-muted">{new Date(log.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted">No audit logs yet</p>}
            </div>
          )}

          {admin.role !== "super_admin" && (
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <AlertCircle size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Data Isolation</h2>
              </div>
              <p className="text-sm text-muted">
                Your {admin.role} role restricts you to{" "}
                {admin.role === "viewer" ? "viewing completed donations only" : "viewing and managing committee members"}.
                Contact super admin for elevated access.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
