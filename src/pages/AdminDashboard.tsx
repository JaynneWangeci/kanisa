import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Users, DollarSign, Clock, AlertCircle,
  Download, LogOut, RefreshCw, Shield, UserPlus, Trash2, Medal, Church,
} from "lucide-react";
import type { DashboardStats, AdminUser, ChurchMember } from "../types";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "members">("overview");
  const [churchMembers, setChurchMembers] = useState<ChurchMember[]>([]);
  const [newName, setNewName] = useState("");
  const [newCouncil, setNewCouncil] = useState("parish_board");
  const [memberError, setMemberError] = useState("");
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

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/members");
      if (res.ok) {
        const data = await res.json();
        setChurchMembers(data.members || []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => {
    if (!admin) return;
    setLoading(false);
    fetchStats();
    fetchLogs();
    fetchMembers();
  }, [admin, fetchStats, fetchLogs, fetchMembers]);

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

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) { setMemberError("Name required"); return; }
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), council: newCouncil }),
      });
      if (!res.ok) { const d = await res.json(); setMemberError(d.error || "Failed"); return; }
      setNewName("");
      setMemberError("");
      fetchMembers();
    } catch { setMemberError("Network error"); }
  }

  async function deleteMember(id: string) {
    try {
      await fetch(`/api/members/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchMembers();
    } catch {}
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

  const groupedMembers = churchMembers.reduce((acc, m) => {
    (acc[m.council] = acc[m.council] || []).push(m);
    return acc;
  }, {} as Record<string, ChurchMember[]>);

  const councilLabels: Record<string, string> = {
    parish_board: "Parish Board",
    women_council: "Women's Council",
    men_council: "Men's Council",
    development: "Development Committee",
  };

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-nobuk">Admin Dashboard</h1>
            <p className="text-xs text-muted">{admin.name} &middot; {admin.role.replace("_", " ")}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { fetchStats(); fetchLogs(); fetchMembers(); }} className="rounded-lg p-2 text-muted transition hover:bg-cream" title="Refresh">
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
        {/* Tab navigation */}
        <div className="mb-6 flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setTab("overview")}
            className={`pb-3 text-sm font-bold transition border-b-2 ${
              tab === "overview" ? "border-nobuk text-nobuk" : "border-transparent text-muted hover:text-nobuk"
            }`}
          >
            Overview
          </button>
          {(admin.role === "admin" || admin.role === "super_admin") && (
            <button
              onClick={() => setTab("members")}
              className={`pb-3 text-sm font-bold transition border-b-2 ${
                tab === "members" ? "border-nobuk text-nobuk" : "border-transparent text-muted hover:text-nobuk"
              }`}
            >
              Church Members ({churchMembers.length})
            </button>
          )}
        </div>

        {tab === "overview" && (
          <>
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
          </>
        )}

        {tab === "members" && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Add member form */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Add Church Member</h2>
              </div>
              <form onSubmit={addMember} className="space-y-4">
                {memberError && (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{memberError}</div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Council</label>
                  <select value={newCouncil} onChange={(e) => setNewCouncil(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                    <option value="parish_board">Parish Board</option>
                    <option value="women_council">Women's Council</option>
                    <option value="men_council">Men's Council</option>
                    <option value="development">Development Committee</option>
                  </select>
                </div>
                <button type="submit"
                  className="w-full rounded-lg bg-nobuk py-2.5 text-sm font-bold text-white hover:bg-nobuk-light">
                  Add Member
                </button>
              </form>
            </div>

            {/* Members list */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <Users size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Church Members</h2>
                <span className="ml-auto text-xs text-muted">{churchMembers.length} total</span>
              </div>
              {churchMembers.length ? (
                <div className="space-y-4">
                  {Object.entries(groupedMembers).map(([council, members]) => (
                    <div key={council}>
                      <div className="mb-2 flex items-center gap-2">
                        <Church size={14} className="text-muted" />
                        <h3 className="text-xs font-bold text-muted uppercase tracking-wider">{councilLabels[council] || council}</h3>
                        <span className="text-[10px] text-muted">{members.length}</span>
                      </div>
                      <div className="space-y-1">
                        {members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-nobuk-muted text-xs font-bold text-nobuk">
                                {m.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-ink">{m.name}</p>
                              </div>
                            </div>
                            <button onClick={() => deleteMember(m.id)}
                              className="rounded-lg p-1.5 text-muted transition hover:bg-red-50 hover:text-red-600">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No members yet. Add your first church member above.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
