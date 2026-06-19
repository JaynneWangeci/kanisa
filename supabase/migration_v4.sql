-- ====== v4: Password Reset Tokens ======

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references admin_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_tokens_hash on password_reset_tokens(token_hash);
create index if not exists idx_password_reset_tokens_admin on password_reset_tokens(admin_id);

-- Clean up expired tokens automatically
create or replace function cleanup_expired_reset_tokens()
returns trigger as $$
begin
  delete from password_reset_tokens where expires_at < now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_cleanup_reset_tokens on password_reset_tokens;
create trigger trigger_cleanup_reset_tokens
  after insert on password_reset_tokens
  execute function cleanup_expired_reset_tokens();
