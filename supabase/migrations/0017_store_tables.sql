-- 0017_store_tables.sql
-- Tabel untuk registrasi meja On the Table + QR code.

create table if not exists public.store_tables (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  table_number integer not null,
  label text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, table_number)
);

create index if not exists store_tables_store_id_idx on public.store_tables (store_id);

alter table public.store_tables enable row level security;

drop policy if exists "store_tables_owner_all" on public.store_tables;
create policy "store_tables_owner_all" on public.store_tables
  for all to authenticated
  using (store_id in (select id from public.stores where user_id = auth.uid()))
  with check (store_id in (select id from public.stores where user_id = auth.uid()));
