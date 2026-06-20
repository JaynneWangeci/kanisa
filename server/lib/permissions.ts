// ── RBAC Permissions ──
// Fine-grained: data type × action × scope
// Roles: super_admin, admin, viewer, committee

export type DataType =
  | "members" | "donations" | "pledges" | "campaigns"
  | "admins" | "analytics" | "settings" | "audit_logs"
  | "committee" | "reminders" | "exports" | "sessions";

export type Action =
  | "create" | "read" | "update" | "delete"
  | "export" | "manage" | "view_sensitive";

export type Scope = "all" | "own" | "committee_only" | "completed_only";

interface Permission {
  dataType: DataType;
  actions: Action[];
  scope: Scope;
}

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    { dataType: "members", actions: ["create", "read", "update", "delete", "export"], scope: "all" },
    { dataType: "donations", actions: ["create", "read", "update", "delete", "export", "view_sensitive"], scope: "all" },
    { dataType: "pledges", actions: ["create", "read", "update", "delete", "export"], scope: "all" },
    { dataType: "campaigns", actions: ["create", "read", "update", "delete", "export"], scope: "all" },
    { dataType: "admins", actions: ["create", "read", "update", "delete"], scope: "all" },
    { dataType: "analytics", actions: ["read", "export"], scope: "all" },
    { dataType: "settings", actions: ["create", "read", "update", "delete"], scope: "all" },
    { dataType: "audit_logs", actions: ["read", "export"], scope: "all" },
    { dataType: "committee", actions: ["create", "read", "update", "delete"], scope: "all" },
    { dataType: "reminders", actions: ["create", "read", "update", "delete"], scope: "all" },
    { dataType: "exports", actions: ["create", "read"], scope: "all" },
    { dataType: "sessions", actions: ["read", "delete"], scope: "all" },
  ],
  admin: [
    { dataType: "members", actions: ["create", "read", "update", "delete", "export"], scope: "all" },
    { dataType: "donations", actions: ["create", "read", "update"], scope: "all" },
    { dataType: "pledges", actions: ["create", "read", "update"], scope: "all" },
    { dataType: "campaigns", actions: ["read"], scope: "all" },
    { dataType: "analytics", actions: ["read", "export"], scope: "all" },
    { dataType: "committee", actions: ["create", "read", "update", "delete"], scope: "all" },
    { dataType: "reminders", actions: ["create", "read", "update"], scope: "all" },
    { dataType: "exports", actions: ["create"], scope: "all" },
  ],
  viewer: [
    { dataType: "donations", actions: ["read"], scope: "completed_only" },
    { dataType: "members", actions: ["read"], scope: "all" },
    { dataType: "pledges", actions: ["read"], scope: "all" },
    { dataType: "campaigns", actions: ["read"], scope: "all" },
    { dataType: "analytics", actions: ["read"], scope: "all" },
  ],
};

export function hasPermission(role: string, dataType: DataType, action: Action): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.some(p => p.dataType === dataType && p.actions.includes(action));
}

export function getScope(role: string, dataType: DataType): Scope {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return "own";
  const found = perms.find(p => p.dataType === dataType);
  return found?.scope || "own";
}

export function canViewSensitive(role: string): boolean {
  return hasPermission(role, "donations", "view_sensitive");
}

export function applyDataScope<T extends Record<string, any>>(rows: T[], role: string, dataType: DataType): T[] {
  const scope = getScope(role, dataType);
  if (scope === "all") return rows;
  if (scope === "completed_only") {
    return rows.filter(r => r.status === "completed").map(r => {
      const masked = { ...r };
      if (masked.phone) masked.phone = String(masked.phone).slice(0, 6) + "****";
      return masked;
    });
  }
  return rows;
}

export function requirePermission(dataType: DataType, action: Action) {
  return (req: any, res: any, next: any) => {
    const admin = req.admin;
    if (!admin) return res.status(401).json({ error: "Not authenticated" });
    if (!hasPermission(admin.role, dataType, action)) {
      return res.status(403).json({ error: `Access denied: ${action} ${dataType}` });
    }
    next();
  };
}

// Cache-busting on permission-related changes
export function invalidatePermissionsCache() {
  // Permissions are static (in-memory), no cache to bust
}
