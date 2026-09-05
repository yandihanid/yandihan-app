-- 0001_baseline_schema.sql
--
-- Tujuan: membawa skema yang SUDAH hidup di Supabase masuk ke version control
-- (temuan A8 -- sebelumnya hanya add_loyalty_customers.sql yang ter-commit).
--
-- File ini IDEMPOTEN dan AMAN dijalankan di project yang sudah berisi data:
--   * hanya "create ... if not exists" dan "add column if not exists"
--   * tidak ada DROP, tidak ada ALTER TYPE, dan tidak ada penambahan NOT NULL
--     pada kolom yang sudah ada (itu bisa gagal / merusak baris lama)
--
-- Jalankan di Supabase SQL Editor. Urutan: 0001 -> 0002 -> 0003 -> 0004.

-- =====================================================================
-- Helper: token kasir
-- =====================================================================
-- Kenapa ada: addCashier dulu tidak pernah mengirim kolom token, jadi kekuatan
-- kredensial POS sepenuhnya bergantung pada DEFAULT kolom yang tidak pernah
-- ter-commit. Sekarang aplikasi membuat token sendiri (24 byte acak), dan
-- DEFAULT ini jadi jaring pengaman untuk baris yang dibuat manual.
-- 64 karakter hex = 256 bit. Tanpa dependensi pgcrypto: gen_random_uuid()
-- sudah ada di core PostgreSQL 13+.
create or replace function public.generate_cashier_token()
returns text
language sql
volatile
as $fn$
  select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$fn$;

-- =====================================================================
-- stores
-- =====================================================================
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.stores add column if not exists unique_code text;
alter table public.stores add column if not exists subscription_tier text default 'FREE';
alter table public.stores add column if not exists subscription_end_date timestamptz;
alter table public.stores add column if not exists receipt_required boolean default true;
alter table public.stores add column if not exists require_sub_product boolean default false;
alter table public.stores add column if not exists require_customer_name boolean default false;
alter table public.stores add column if not exists waiting_list_enabled boolean default false;
alter table public.stores add column if not exists address text;
alter table public.stores add column if not exists phone text;
alter table public.stores add column if not exists updated_at timestamptz default now();

-- Kolom loyalitas: sudah dibuat add_loyalty_customers.sql, diulang di sini
-- supaya 0001 berdiri sendiri kalau dijalankan di project baru.
alter table public.stores add column if not exists pelanggan_enabled boolean default false;
alter table public.stores add column if not exists visit_threshold integer default 5;
alter table public.stores add column if not exists discount_percent integer default 10;

-- unique_code dipakai bot Telegram (/start KODE_TOKO) untuk menemukan toko.
-- Wajib unik, kalau tidak lookup .single() di webhook bisa meledak.
create unique index if not exists stores_unique_code_key
  on public.stores (unique_code)
  where unique_code is not null;

create index if not exists stores_user_id_idx on public.stores (user_id);

-- Isi unique_code untuk baris lama yang masih NULL.
update public.stores
set unique_code = upper(substr(replace(id::text, '-', ''), 1, 8))
where unique_code is null;

-- =====================================================================
-- cashiers
-- =====================================================================
create table if not exists public.cashiers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  token text not null default public.generate_cashier_token(),
  created_at timestamptz not null default now()
);

alter table public.cashiers add column if not exists device_id text;
alter table public.cashiers add column if not exists telegram_chat_id text;
alter table public.cashiers alter column token set default public.generate_cashier_token();

create unique index if not exists cashiers_token_key on public.cashiers (token);
create index if not exists cashiers_store_id_idx on public.cashiers (store_id);

-- UNIK dan sengaja BUKAN partial index.
-- Webhook Telegram memakai upsert dengan onConflict: 'telegram_chat_id'.
-- ON CONFLICT hanya bisa menyimpulkan index unik yang tidak partial, jadi
-- `where telegram_chat_id is not null` justru akan membuat upsert-nya gagal.
-- Kolom nullable aman: PostgreSQL memperlakukan setiap NULL sebagai berbeda,
-- jadi semua kasir web (telegram_chat_id NULL) tetap boleh berdampingan.
create unique index if not exists cashiers_telegram_chat_id_key
  on public.cashiers (telegram_chat_id);

-- =====================================================================
-- products
-- =====================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  price numeric(14, 2) not null default 0,
  stock integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists updated_at timestamptz default now();

create index if not exists products_store_id_idx on public.products (store_id);

-- Stok tidak boleh negatif. RPC di 0003 sudah mencegahnya secara atomik;
-- constraint ini jaring pengaman terakhir untuk jalur lain. Dibuat NOT VALID
-- supaya baris lama yang mungkin sudah minus tidak memblokir migrasi.
do $chk$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_stock_non_negative'
  ) then
    alter table public.products
      add constraint products_stock_non_negative check (stock >= 0) not valid;
  end if;
end
$chk$;

-- =====================================================================
-- transactions
-- =====================================================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  cashier_id uuid references public.cashiers (id) on delete set null,
  amount numeric(14, 2) not null default 0,
  product_name text,
  payment_method text,
  receipt_url text,
  status text default 'completed',
  created_at timestamptz not null default now()
);

alter table public.transactions add column if not exists cash_received numeric(14, 2);
alter table public.transactions add column if not exists change_amount numeric(14, 2);
alter table public.transactions add column if not exists buyer_name text;
alter table public.transactions add column if not exists original_amount numeric(14, 2);
alter table public.transactions add column if not exists discount_percent integer default 0;
alter table public.transactions add column if not exists customer_name text;
alter table public.transactions add column if not exists customer_phone text;

-- Dashboard dan laporan selalu memfilter store_id lalu mengurutkan created_at.
create index if not exists transactions_store_created_idx
  on public.transactions (store_id, created_at desc);

-- WaitingList memfilter status = 'pending' per toko.
create index if not exists transactions_store_status_idx
  on public.transactions (store_id, status);

-- =====================================================================
-- customers (lihat juga add_loyalty_customers.sql)
-- =====================================================================
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text,
  phone text,
  visit_count integer not null default 1,
  total_spent numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_store_phone_key
  on public.customers (store_id, phone);
create index if not exists customers_store_id_idx on public.customers (store_id);
