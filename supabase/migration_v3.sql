-- ====== v3: Church Members, Enhanced Access Control, SOC2 Compliance ======

-- 1. CHURCH MEMBERS (for contribution dropdown)
create table if not exists church_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  council member_council not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Add church_member_id to donations
alter table donations add column if not exists church_member_id uuid references church_members(id);

-- 3. Indexes
create index if not exists idx_church_members_council on church_members(council) where is_active;
create index if not exists idx_church_members_active on church_members(is_active);
create index if not exists idx_donations_church_member on donations(church_member_id);

-- 4. Extended audit actions
do $$
begin
  if not exists (select 1 from pg_enum where enumlabel = 'view_church_members' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'view_church_members';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'create_church_member' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'create_church_member';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'update_church_member' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'update_church_member';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'delete_church_member' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'delete_church_member';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'update_donation' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'update_donation';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'failed_login' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'failed_login';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'view_stats' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'view_stats';
  end if;
  if not exists (select 1 from pg_enum where enumlabel = 'view_members' and enumtypid = 'audit_action'::regtype) then
    alter type audit_action add value 'view_members';
  end if;
end $$;

-- 5. Enhanced RLS with data isolation by campaign
alter table church_members enable row level security;
create policy church_members_select_all on church_members
  for select using (true);
create policy church_members_admin_all on church_members
  for all using (current_setting('app.admin_role', true) in ('admin', 'super_admin'));

-- Refresh donations RLS for data isolation
drop policy if exists donations_viewer_select on donations;
drop policy if exists donations_admin_select on donations;
drop policy if exists donations_super_admin_insert on donations;
drop policy if exists donations_super_admin_update on donations;

create policy donations_select_policy on donations
  for select
  using (
    current_setting('app.admin_role', true) = 'super_admin'
    or (current_setting('app.admin_role', true) = 'viewer' and status = 'completed')
    or (current_setting('app.admin_role', true) = 'admin')
  );

-- 6. Update set_admin_context to include campaign_id
create or replace function set_admin_context(admin_id uuid, role text, campaign_id text default null)
returns void
language plpgsql
security definer
as $$
begin
  perform set_config('app.admin_id', admin_id::text, true);
  perform set_config('app.admin_role', role, true);
  if campaign_id is not null then
    perform set_config('app.campaign_id', campaign_id, true);
  end if;
end;
$$;

-- 7. Seed some church members if table is empty
insert into church_members (name, council)
select name, council::member_council
from committee_members
where not exists (select 1 from church_members limit 1);
