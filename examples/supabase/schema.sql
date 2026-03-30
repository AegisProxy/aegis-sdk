-- Encrypted Aegis mapping blob per logical session.
-- Run in Supabase SQL editor. Adjust table/column names to match your app.

create table if not exists public.aegis_session_mappings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  -- Stable id for your chat / job (string is fine)
  session_key text not null,
  salt text not null,
  iv text not null,
  ciphertext text not null,
  updated_at timestamptz not null default now(),
  unique (owner_id, session_key)
);

alter table public.aegis_session_mappings enable row level security;

create policy "Users read own mapping rows"
  on public.aegis_session_mappings for select
  using (auth.uid() = owner_id);

create policy "Users insert own mapping rows"
  on public.aegis_session_mappings for insert
  with check (auth.uid() = owner_id);

create policy "Users update own mapping rows"
  on public.aegis_session_mappings for update
  using (auth.uid() = owner_id);

create policy "Users delete own mapping rows"
  on public.aegis_session_mappings for delete
  using (auth.uid() = owner_id);
