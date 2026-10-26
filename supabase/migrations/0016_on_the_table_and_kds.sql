-- 0016_on_the_table_and_kds.sql
-- Fitur On the Table (scan QR meja) dan Kitchen Display System.

alter table public.stores
  add column if not exists on_table_enabled boolean not null default false;

alter table public.transactions
  add column if not exists table_number integer;

alter table public.transactions
  add column if not exists kitchen_status text default 'pending';

create index if not exists transactions_store_table_idx on public.transactions (store_id, table_number);
create index if not exists transactions_store_kitchen_status_idx on public.transactions (store_id, kitchen_status, created_at);
