export interface Campaign {
  id: string;
  slug: string;
  title: string;
  description: string;
  goal: number;
  raised: number;
  currency: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
}

export interface Donation {
  id: string;
  campaign_id: string;
  donor_name: string | null;
  amount: number;
  method: "mpesa";
  status: "pending" | "completed" | "failed";
  checkout_request_id: string | null;
  receipt_number: string | null;
  message: string | null;
  phone: string | null;
  honored_member_id: string | null;
  church_member_id: string | null;
  created_at: string;
}

export interface Council {
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface CommitteeMember {
  id: string;
  name: string;
  role: string;
  council: string;
  photo_url: string | null;
  order: number;
}

export interface ChurchMember {
  id: string;
  name: string;
  council: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "viewer";
  created_at: string;
}

export type AuditAction =
  | "login" | "logout" | "failed_login"
  | "view_donations" | "view_donation" | "update_donation"
  | "export_ledger"
  | "view_stats" | "view_members"
  | "create_committee" | "update_committee" | "delete_committee"
  | "view_church_members" | "create_church_member" | "update_church_member" | "delete_church_member"
  | "view_audit_logs"
  | "create_council" | "update_council" | "delete_council"
  | "update_settings"
  | "create_admin" | "update_admin" | "delete_admin" | "update_self_password";

export interface AuditLog {
  id: string;
  admin_id: string;
  action: AuditAction;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  admin_name?: string;
}

export interface DashboardStats {
  goal: number;
  raised: number;
  total_raised: number;
  total_donors: number;
  avg_gift: number;
  pending_count: number;
  failed_count: number;
  member_count: number;
  recent_donations: {
    id: string;
    donor_name: string | null;
    amount: number;
    status: string;
    created_at: string;
  }[];
}

export const COUNCIL_LABELS: Record<string, string> = {
  maranatha_fellowship: "Maranatha Fellowship",
  bethlehem_fellowship: "Bethlehem Fellowship",
  jerusalem_fellowship: "Jerusalem Fellowship",
  aefeso_fellowship: "Aefeso Fellowship",
  galilee_fellowship: "Galilee Fellowship",
  bethel_fellowship: "Bethel Fellowship",
  berea_fellowship: "Berea Fellowship",
  judea_fellowship: "Judea Fellowship",
};

export const DEFAULT_COUNCILS: Council[] = [
  { slug: "maranatha_fellowship", name: "Maranatha Fellowship", is_active: true, created_at: "" },
  { slug: "bethlehem_fellowship", name: "Bethlehem Fellowship", is_active: true, created_at: "" },
  { slug: "jerusalem_fellowship", name: "Jerusalem Fellowship", is_active: true, created_at: "" },
  { slug: "aefeso_fellowship", name: "Aefeso Fellowship", is_active: true, created_at: "" },
];
