-- ── Performance & Security Migration ──
-- 1. Database indexes for fast queries
-- 2. Immutable audit log table (append-only)
-- 3. RLS policies for data isolation
-- 4. Audit summary function

-- ════════════════════════════════════════════
-- 1. INDEXES
-- ════════════════════════════════════════════

-- Donations
CREATE INDEX IF NOT EXISTS idx_donations_status_created ON donations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_campaign_status ON donations (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_donations_donor_name ON donations USING gin (donor_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_donations_honored_member ON donations (honored_member_id) WHERE honored_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donations_church_member ON donations (church_member_id) WHERE church_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donations_checkout ON donations (checkout_request_id) WHERE checkout_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donations_receipt ON donations (receipt_number) WHERE receipt_number IS NOT NULL;

-- Pledges
CREATE INDEX IF NOT EXISTS idx_pledges_status ON pledges (status);
CREATE INDEX IF NOT EXISTS idx_pledges_donor_name ON pledges USING gin (donor_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pledges_campaign ON pledges (campaign_id);
CREATE INDEX IF NOT EXISTS idx_pledges_remaining ON pledges (remaining) WHERE remaining > 0;

-- Members
CREATE INDEX IF NOT EXISTS idx_members_name ON church_members USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_members_council ON church_members (council);
CREATE INDEX IF NOT EXISTS idx_members_active ON church_members (active) WHERE active = true;

-- Admin sessions
CREATE INDEX IF NOT EXISTS idx_sessions_admin ON admin_sessions (admin_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON admin_sessions (token_hash);

-- Campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns (slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns (is_active) WHERE is_active = true;

-- Commitments
CREATE INDEX IF NOT EXISTS idx_committee_council ON committee_members (council);
CREATE INDEX IF NOT EXISTS idx_committee_order ON committee_members ("order") WHERE "order" IS NOT NULL;

-- Enable pg_trgm for fuzzy text search
-- CREATE EXTENSION IF NOT EXISTS pg_trgm; -- requires superuser, run separately if needed

-- ════════════════════════════════════════════
-- 2. IMMUTABLE AUDIT LOG TABLE (append-only)
-- ════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs_immutable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id UUID NOT NULL,
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  immutable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for immutable audit
CREATE INDEX IF NOT EXISTS idx_audit_immutable_timestamp ON audit_logs_immutable (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_immutable_actor ON audit_logs_immutable (actor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_immutable_action ON audit_logs_immutable (action, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_immutable_resource ON audit_logs_immutable (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_immutable_ip ON audit_logs_immutable (ip_address);

-- Append-only trigger (prevents UPDATE/DELETE on immutable table)
CREATE OR REPLACE FUNCTION prevent_immutable_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Cannot modify immutable audit log entries';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_immutable_no_update ON audit_logs_immutable;
CREATE TRIGGER trg_audit_immutable_no_update
  BEFORE UPDATE OR DELETE ON audit_logs_immutable
  FOR EACH ROW EXECUTE FUNCTION prevent_immutable_modification();

-- Also add IF NOT EXISTS columns to existing audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ;
UPDATE audit_logs SET timestamp = created_at WHERE timestamp IS NULL;

-- ════════════════════════════════════════════
-- 3. RLS DATA ISOLATION POLICIES
-- ════════════════════════════════════════════

-- Enable RLS on all tables (if not already)
ALTER TABLE IF EXISTS donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS church_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs_immutable ENABLE ROW LEVEL SECURITY;

-- Donations: viewer sees only completed
CREATE OR REPLACE FUNCTION get_admin_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(NULLIF(current_setting('app.admin_role', true), ''), 'viewer');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS donations_isolation ON donations;
CREATE POLICY donations_isolation ON donations
  FOR ALL
  USING (
    get_admin_role() = 'super_admin'
    OR (get_admin_role() = 'admin')
    OR (get_admin_role() = 'viewer' AND status = 'completed')
  );

-- ════════════════════════════════════════════
-- 4. AUDIT SUMMARY FUNCTION
-- ════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_audit_summary(
  from_date TIMESTAMPTZ,
  to_date TIMESTAMPTZ,
  group_col TEXT DEFAULT 'actor_id'
)
RETURNS TABLE(
  group_key TEXT,
  event_count BIGINT,
  last_event TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT %I::TEXT AS group_key, COUNT(*)::BIGINT AS event_count, MAX(timestamp)::TIMESTAMPTZ AS last_event
     FROM audit_logs_immutable
     WHERE timestamp >= $1 AND timestamp <= $2
     GROUP BY %I
     ORDER BY event_count DESC',
    group_col, group_col
  ) USING from_date, to_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
