import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Users, DollarSign, Clock, AlertCircle,
  Download, LogOut, RefreshCw, Shield, UserPlus, Trash2, Medal, Church, Settings, BarChart3, FileText, Presentation, Search, ScanSearch,
} from "lucide-react";
import type { DashboardStats, AdminUser, ChurchMember } from "../types";

interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [tab, setTab] = useState<"overview" | "members" | "admins" | "analytics">("overview");
  const [churchMembers, setChurchMembers] = useState<ChurchMember[]>([]);
  const [newName, setNewName] = useState("");
  const [newCouncil, setNewCouncil] = useState("parish_board");
  const [memberError, setMemberError] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [bulkCouncil, setBulkCouncil] = useState("parish_board");
  const [bulkError, setBulkError] = useState("");
  const [bulkResult, setBulkResult] = useState("");
  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("admin");
  const [adminError, setAdminError] = useState("");
  const [editingAdmin, setEditingAdmin] = useState<AdminUserRecord | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwError, setPwError] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [deduping, setDeduping] = useState(false);
  const [dedupResult, setDedupResult] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);
  const [exporting, setExporting] = useState<string | null>(null);
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
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const fetchAdmins = useCallback(async () => {
    if (admin?.role !== "super_admin") return;
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdmins(data.users || []);
      }
    } catch { /* silent */ }
  }, [admin?.role, token]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch("/api/contributions/analytics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAnalytics(await res.json());
    } catch { /* silent */ }
  }, [token]);

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
    fetchAdmins();
    fetchAnalytics();
  }, [admin, fetchStats, fetchLogs, fetchMembers, fetchAdmins, fetchAnalytics]);

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
    const url = format === "csv" ? "/api/ledger/export" : format === "pdf" ? "/api/contributions/export/pdf" : `/api/export/${format}`;
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
    if (!newName.trim()) { setMemberError("Kindly provide the member's name"); return; }
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), council: newCouncil }),
      });
      if (!res.ok) { const d = await res.json(); setMemberError(d.error || "Something went wrong. Please try again."); return; }
      setNewName("");
      setMemberError("");
      fetchMembers();
    } catch { setMemberError("A connection issue occurred. Please try again."); }
  }

  async function handleBulkAdd() {
    const lines = bulkNames.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { setBulkError("Please paste at least one name to add"); return; }
    setBulkError(""); setBulkResult("");

    const parsed = lines.map(parseLine).filter(Boolean) as { name: string; council: string }[];
    if (!parsed.length) { setBulkError("We couldn't identify any names. Use 'Name - Council' or 'Name, Council' format."); return; }

    const existing = new Map(churchMembers.map(m => [m.name.toLowerCase().trim(), m]));
    const toAdd: { name: string; council: string }[] = [];
    const duplicates: string[] = [];

    for (const entry of parsed) {
      if (existing.has(entry.name.toLowerCase())) {
        const dup = existing.get(entry.name.toLowerCase())!;
        duplicates.push(`${entry.name} (already in ${councilLabels[dup.council] || dup.council})`);
      } else {
        toAdd.push(entry);
      }
    }

    toAdd.sort((a, b) => a.name.localeCompare(b.name));

    if (!toAdd.length) {
      setBulkError("All these names are already in our church registry.");
      return;
    }

    const addedNames = new Set<string>();
    const serverDups: string[] = [];
    let added = 0;
    for (const { name, council } of toAdd) {
      try {
        const res = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name, council }),
        });
        if (res.ok) { added++; addedNames.add(name); continue; }
        if (res.status === 409) serverDups.push(`${name} (already in DB)`);
      } catch {}
    }

    const allDups = [...duplicates, ...serverDups];
    const keptLines = parsed.filter(e => !addedNames.has(e.name));
    let msg = `${added} member${added !== 1 ? 's' : ''} added.`;
    if (allDups.length) {
      msg += `\n${allDups.length} duplicate${allDups.length !== 1 ? 's' : ''} skipped:\n${allDups.join('\n')}`;
    }
    setBulkResult(msg);
    setBulkNames(keptLines.length ? keptLines.map(e => e.name).join('\n') : "");
    if (added > 0) fetchMembers();
  }

  function toggleMember(id: string) {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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

  async function handleBulkDelete() {
    if (selectedMembers.size === 0) return;
    if (!confirm(`Remove ${selectedMembers.size} member${selectedMembers.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    try {
      await fetch("/api/members/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: Array.from(selectedMembers) }),
      });
      setSelectedMembers(new Set());
      fetchMembers();
    } catch {}
  }

  async function handleDedup() {
    if (!confirm("Find and remove duplicate member names? This cannot be undone.")) return;
    setDeduping(true);
    setDedupResult("");
    try {
      const res = await fetch("/api/members/dedup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDedupResult(data.message || "Done.");
      if (data.deduped > 0) fetchMembers();
    } catch { setDedupResult("Something went wrong. Please try again."); }
    finally { setDeduping(false); }
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

  const labelToCouncil: Record<string, string> = {
    'parish board': 'parish_board',
    'women\'s council': 'women_council',
    'women council': 'women_council',
    'men\'s council': 'men_council',
    'men council': 'men_council',
    'development committee': 'development',
    development: 'development',
  };

  function parseLine(line: string): { name: string; council: string } | null {
    const trimmed = line.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(.+?)\s*[,|]\s*(.+)$/) || trimmed.match(/^(.+?)\s*-\s*(.+)$/);
    if (match) {
      const name = match[1].trim();
      const councilLabel = match[2].trim().toLowerCase();
      const council = labelToCouncil[councilLabel];
      if (name && council) return { name, council };
    }
    return { name: trimmed, council: bulkCouncil };
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-nobuk">Admin Dashboard</h1>
            <p className="text-xs text-muted">{admin.name} &middot; {admin.role.replace("_", " ")}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { fetchStats(); fetchLogs(); fetchMembers(); fetchAdmins(); fetchAnalytics(); }} className="rounded-lg p-2 text-muted transition hover:bg-cream" title="Refresh">
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
          {admin.role === "super_admin" && (
            <button
              onClick={() => setTab("admins")}
              className={`pb-3 text-sm font-bold transition border-b-2 ${
                tab === "admins" ? "border-nobuk text-nobuk" : "border-transparent text-muted hover:text-nobuk"
              }`}
            >
              Admins ({admins.length})
            </button>
          )}
          <button
            onClick={() => setTab("analytics")}
            className={`pb-3 text-sm font-bold transition border-b-2 ${
              tab === "analytics" ? "border-nobuk text-nobuk" : "border-transparent text-muted hover:text-nobuk"
            }`}
          >
            <BarChart3 size={14} className="inline mr-1" />
            Analytics
          </button>
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
                    {stats.recent_donations.slice(0, 10).map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{d.donor_name || "Anonymous"}</p>
                          <p className="text-xs text-muted">{d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}</p>
                        </div>
                        <div className="ml-3 text-right shrink-0">
                          <p className="text-sm font-bold text-ink tabular-nums">KES {Number(d.amount || 0).toLocaleString()}</p>
                          <span className={`text-xs font-semibold ${
                            d.status === "completed" ? "text-green-600" :
                            d.status === "pending" ? "text-amber-600" :
                            "text-red-600"
                          }`}>
                            {(d.status || "unknown").replace("_", " ")}
                          </span>
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
                <h2 className="text-sm font-bold text-ink">Add Single Member</h2>
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

            {/* Bulk add */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Bulk Add Members</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Upload file (.txt or .csv)</label>
                  <input
                    type="file"
                    accept=".txt,.csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const text = await file.text();
                      const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
                      const seen = new Set<string>();
                      const lines: string[] = [];
                      for (const line of rawLines) {
                        const sep = line.match(/^([^,|\-]+?)\s*[,|\-]\s*(.+)$/);
                        const name = sep ? sep[1].trim() : line;
                        const nameKey = name.toLowerCase();
                        if (nameKey && !seen.has(nameKey)) {
                          seen.add(nameKey);
                          lines.push(line);
                        }
                      }
                      setBulkNames(lines.join('\n'));
                      e.target.value = '';
                    }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk file:mr-3 file:rounded file:border-0 file:bg-nobuk file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-nobuk-light"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Or paste names (one per line)</label>
                  <textarea
                    value={bulkNames}
                    onChange={(e) => setBulkNames(e.target.value)}
                    placeholder="John Doe&#10;Jane Smith&#10;Mary Wanjiku"
                    rows={6}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk resize-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">Council for all</label>
                  <select value={bulkCouncil} onChange={(e) => setBulkCouncil(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                    <option value="parish_board">Parish Board</option>
                    <option value="women_council">Women's Council</option>
                    <option value="men_council">Men's Council</option>
                    <option value="development">Development Committee</option>
                  </select>
                </div>
                {bulkError && (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{bulkError}</div>
                )}
                {bulkResult && (
                  <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-700">{bulkResult}</div>
                )}
                <button onClick={handleBulkAdd} disabled={!bulkNames.trim()}
                  className="w-full rounded-lg bg-nobuk py-2.5 text-sm font-bold text-white hover:bg-nobuk-light disabled:opacity-40">
                  Add {bulkNames.trim() ? bulkNames.trim().split('\n').filter(n => n.trim()).length : 0} Members
                </button>
              </div>
            </div>

            {/* Members list */}
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:col-span-3">
              <div className="mb-4 flex items-center gap-2">
                <Users size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Church Members</h2>
                <button onClick={handleDedup} disabled={deduping}
                  className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-muted hover:bg-cream transition disabled:opacity-40">
                  <ScanSearch size={14} /> {deduping ? "Scanning..." : "Find Duplicates"}
                </button>
                <span className="text-xs text-muted">{churchMembers.length} total</span>
              </div>
              {dedupResult && (
                <div className="mb-3 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-xs text-green-700">{dedupResult}</div>
              )}
              <div className="mb-4 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-cream py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-nobuk"
                  />
                </div>
                {selectedMembers.size > 0 && (
                  <button onClick={handleBulkDelete}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 transition">
                    <Trash2 size={14} /> Delete {selectedMembers.size} selected
                  </button>
                )}
              </div>
              {churchMembers.length ? (
                <div className="space-y-4">
                  {Object.entries(groupedMembers).map(([council, councilMembers]) => {
                    const filteredCouncil = memberSearch
                      ? councilMembers.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()))
                      : councilMembers;
                    if (filteredCouncil.length === 0) return null;
                    return (
                      <div key={council}>
                        <div className="mb-2 flex items-center gap-2">
                          <Church size={14} className="text-muted" />
                          <h3 className="text-xs font-bold text-muted uppercase tracking-wider">{councilLabels[council] || council}</h3>
                          <span className="text-[10px] text-muted">{filteredCouncil.length}</span>
                        </div>
                        <div className="space-y-1">
                          {filteredCouncil.map((m) => (
                            <div key={m.id} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2">
                              <div className="flex items-center gap-3">
                                <input type="checkbox" checked={selectedMembers.has(m.id)}
                                  onChange={() => toggleMember(m.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-nobuk focus:ring-nobuk" />
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
                    );
                      })}
                  </div>
              ) : (
                <p className="text-sm text-muted">No members yet. Add your first church member above.</p>
              )}
            </div>
          </div>
        )}

        {tab === "admins" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-nobuk" />
                  <h2 className="text-sm font-bold text-ink">Admin Users</h2>
                </div>
                <button
                  onClick={() => setShowAddAdmin(!showAddAdmin)}
                  className="flex items-center gap-1 rounded-lg bg-nobuk px-3 py-1.5 text-xs font-semibold text-white hover:bg-nobuk-light"
                >
                  <UserPlus size={14} /> Add Admin
                </button>
              </div>

              {showAddAdmin && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-cream p-4">
                  <h3 className="mb-3 text-sm font-bold text-ink">New Admin</h3>
                  {adminError && (
                    <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{adminError}</div>
                  )}
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">Name</label>
                      <input type="text" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">Email</label>
                      <input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="admin@church.org"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">Password</label>
                      <input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">Role</label>
                      <select value={newAdminRole} onChange={(e) => setNewAdminRole(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!newAdminName || !newAdminEmail || !newAdminPassword) { setAdminError("Please fill in all fields"); return; }
                      setAdminError("");
                      try {
                        const res = await fetch("/api/admin/admins", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ name: newAdminName, email: newAdminEmail, password: newAdminPassword, role: newAdminRole }),
                        });
                        if (!res.ok) { const d = await res.json(); setAdminError(d.error || "Something went wrong. Please try again."); return; }
                        setNewAdminName(""); setNewAdminEmail(""); setNewAdminPassword(""); setNewAdminRole("admin");
                        setShowAddAdmin(false);
                        fetchAdmins();
                      } catch { setAdminError("A connection issue occurred. Please try again."); }
                    }}
                    className="mt-3 rounded-lg bg-nobuk px-4 py-2 text-xs font-semibold text-white hover:bg-nobuk-light"
                  >
                    Create Admin
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {admins.map((a) => (
                  <div key={a.id} className="rounded-lg border border-gray-100 bg-cream px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-ink">{a.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            a.role === "super_admin"
                              ? "bg-purple-100 text-purple-700"
                              : a.role === "admin"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                          }`}>
                            {a.role.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-muted">{a.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingAdmin(editingAdmin?.id === a.id ? null : a);
                            setEditEmail(a.email);
                            setEditName(a.name);
                            setEditRole(a.role);
                          }}
                          className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-white hover:text-nobuk"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete admin "${a.name}"?`)) return;
                            try {
                              await fetch(`/api/admin/users/${a.id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              fetchAdmins();
                            } catch {}
                          }}
                          className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {editingAdmin?.id === a.id && (
                      <div className="mt-3 border-t border-gray-200 pt-3">
                        <div className="grid gap-3 sm:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-xs font-bold text-muted">Name</label>
                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-muted">Email</label>
                            <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-bold text-muted">Role</label>
                            <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk">
                              <option value="super_admin">Super Admin</option>
                              <option value="admin">Admin</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                          <div className="flex items-end gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/users/${a.id}`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ name: editName, email: editEmail, role: editRole }),
                                  });
                                  if (res.ok) { setEditingAdmin(null); fetchAdmins(); }
                                } catch {}
                              }}
                              className="rounded-lg bg-nobuk px-3 py-2 text-xs font-semibold text-white hover:bg-nobuk-light"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingAdmin(null)}
                              className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-muted hover:bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {admins.length === 0 && (
                  <p className="text-sm text-muted">No admin users found.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Settings size={16} className="text-nobuk" />
                <h2 className="text-sm font-bold text-ink">Change My Password</h2>
              </div>
              {pwError && (
                <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">{pwError}</div>
              )}
              {!showChangePw ? (
                <button
                  onClick={() => setShowChangePw(true)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-muted hover:bg-cream"
                >
                  Change Password
                </button>
              ) : (
                <div className="flex gap-3">
                  <input type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)}
                    placeholder="Current password"
                    className="w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                  <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)}
                    placeholder="New password (min 6)"
                    className="w-48 rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink outline-none focus:border-nobuk" />
                  <button
                    onClick={async () => {
                      if (!pwCurrent || !pwNew) { setPwError("Please enter both current and new password"); return; }
                      if (pwNew.length < 6) { setPwError("Password must be at least 6 characters"); return; }
                      setPwError("");
                      try {
                        const res = await fetch(`/api/admin/users/${admin!.id}/password`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
                        });
                        if (!res.ok) { const d = await res.json(); setPwError(d.error || "Something went wrong. Please try again."); return; }
                        setPwCurrent(""); setPwNew(""); setShowChangePw(false);
                      } catch { setPwError("A connection issue occurred. Please try again."); }
                    }}
                    className="rounded-lg bg-nobuk px-4 py-2 text-xs font-semibold text-white hover:bg-nobuk-light"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => { setShowChangePw(false); setPwError(""); }}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-muted hover:bg-cream"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "analytics" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-nobuk" />
                  <h2 className="text-sm font-bold text-ink">Contribution Analytics</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setExporting("pdf");
                      try {
                        const res = await fetch("/api/contributions/export/pdf", {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (!res.ok) return;
                        const blob = await res.blob();
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `harambee-report-${new Date().toISOString().slice(0, 10)}.pdf`;
                        a.click();
                        URL.revokeObjectURL(a.href);
                      } catch {}
                      setExporting(null);
                    }}
                    disabled={exporting === "pdf"}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-muted hover:bg-cream disabled:opacity-40"
                  >
                    <FileText size={14} /> {exporting === "pdf" ? "Generating..." : "PDF"}
                  </button>
                  <button
                    onClick={async () => {
                      setExporting("ppt");
                      try {
                        const res = await fetch("/api/contributions/export/ppt", {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (!res.ok) return;
                        const blob = await res.blob();
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = `harambee-report-${new Date().toISOString().slice(0, 10)}.pptx`;
                        a.click();
                        URL.revokeObjectURL(a.href);
                      } catch {}
                      setExporting(null);
                    }}
                    disabled={exporting === "ppt"}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-muted hover:bg-cream disabled:opacity-40"
                  >
                    <Presentation size={14} /> {exporting === "ppt" ? "Generating..." : "PPT"}
                  </button>
                </div>
              </div>

              {analytics ? (
                <>
                  <div className="mb-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg bg-nobuk p-4 text-white">
                      <p className="text-xs font-medium uppercase tracking-wider opacity-80">Total Raised</p>
                      <p className="mt-1 text-2xl font-bold">KES {analytics.overall_total?.toLocaleString("en-KE") || "0"}</p>
                    </div>
                    <div className="rounded-lg bg-nobuk-light p-4 text-white">
                      <p className="text-xs font-medium uppercase tracking-wider opacity-80">Total Donations</p>
                      <p className="mt-1 text-2xl font-bold">{analytics.overall_count || 0}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-cream p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted">Honoured Members</p>
                      <p className="mt-1 text-2xl font-bold text-nobuk">{analytics.member_ranking?.length || 0}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="mb-3 text-sm font-bold text-ink">Daily Contributions (30 days)</h3>
                    <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: 120 }}>
                      {analytics.daily?.map((d: any) => {
                        const max = Math.max(...analytics.daily.map((x: any) => x.total), 1);
                        const h = Math.max((d.total / max) * 80, 2);
                        return (
                          <div key={d.date} className="flex flex-col items-center shrink-0" style={{ width: 28 }}>
                            <span className="text-[9px] font-bold text-nobuk tabular-nums">{(d.total / 1000).toFixed(0)}k</span>
                            <div
                              className="mt-1 w-full rounded-t"
                              style={{ height: h, background: "linear-gradient(180deg, #C4964A, #1E6F9F)", minHeight: 2 }}
                              title={`${d.date}: KES ${d.total.toLocaleString("en-KE")}`}
                            />
                            <span className="mt-1 text-[8px] text-muted">{d.date.slice(5)}</span>
                          </div>
                        );
                      })}
                      {(!analytics.daily || analytics.daily.length === 0) && (
                        <p className="text-sm text-muted">No donation data in the last 30 days.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-lg border border-gray-100 bg-cream p-4">
                      <h3 className="mb-3 text-sm font-bold text-ink">Council Breakdown</h3>
                      {analytics.council_breakdown?.length ? (
                        <div className="space-y-2">
                          {analytics.council_breakdown.map((c: any) => {
                            const maxCouncil = Math.max(...analytics.council_breakdown.map((x: any) => x.total), 1);
                            const pct = Math.round((c.total / maxCouncil) * 100);
                            return (
                              <div key={c.council}>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-ink">{c.council.replace(/_/g, " ")}</span>
                                  <span className="font-bold text-nobuk">KES {c.total.toLocaleString("en-KE")}</span>
                                </div>
                                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-white">
                                  <div className="h-full rounded-full bg-nobuk" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted">No council data yet.</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-gray-100 bg-cream p-4">
                      <h3 className="mb-3 text-sm font-bold text-ink">Top Donors</h3>
                      {analytics.top_donors?.length ? (
                        <div className="space-y-1">
                          {analytics.top_donors.slice(0, 10).map((d: any, i: number) => (
                            <div key={i} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-nobuk-muted text-[10px] font-bold text-nobuk">
                                  {i + 1}
                                </span>
                                <span className="text-sm font-medium text-ink">{d.name}</span>
                              </div>
                              <span className="text-sm font-bold text-nobuk tabular-nums">KES {d.amount.toLocaleString("en-KE")}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted">No donor data yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 rounded-lg border border-gray-100 bg-cream p-4">
                    <h3 className="mb-3 text-sm font-bold text-ink">Member Honour Ranking</h3>
                    {analytics.member_ranking?.length ? (
                      <div className="space-y-1">
                        {analytics.member_ranking.slice(0, 20).map((m: any, i: number) => (
                          <div key={m.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                                i === 0 ? "bg-amber text-white" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-amber-light text-amber-dark" : "bg-nobuk-muted text-nobuk"
                              }`}>
                                {i + 1}
                              </span>
                              <div>
                                <p className="text-sm font-medium text-ink">{m.name}</p>
                                <p className="text-[10px] text-muted">{m.council.replace(/_/g, " ")} &middot; {m.count} donations</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-nobuk tabular-nums">KES {m.total.toLocaleString("en-KE")}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted">No member honour data yet.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-nobuk border-t-transparent" />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
