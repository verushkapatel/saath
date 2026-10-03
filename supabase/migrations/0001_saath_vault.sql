-- Saath: one locked row per user.
-- The app encrypts `data` on the phone with a key the server never receives,
-- so this table only ever holds unreadable text.

create table if not exists public.saath_vault (
  user_id uuid primary key references auth.users (id) on delete cascade,
  salt text not null,
  iv text not null,
  data text not null,
  updated_at timestamptz not null default now()
);

alter table public.saath_vault enable row level security;

drop policy if exists "saath_vault_select_own" on public.saath_vault;
create policy "saath_vault_select_own" on public.saath_vault
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "saath_vault_insert_own" on public.saath_vault;
create policy "saath_vault_insert_own" on public.saath_vault
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "saath_vault_update_own" on public.saath_vault;
create policy "saath_vault_update_own" on public.saath_vault
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "saath_vault_delete_own" on public.saath_vault;
create policy "saath_vault_delete_own" on public.saath_vault
  for delete to authenticated using (auth.uid() = user_id);

revoke all on public.saath_vault from anon;
grant select, insert, update, delete on public.saath_vault to authenticated;
