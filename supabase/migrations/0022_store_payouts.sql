-- 0022_store_payouts.sql
-- Pemisahan uang per toko dan pencairan (disbursement) ke rekening toko.
--
-- Latar belakang: pengajuan XenPlatform (sub-account) tidak disetujui, jadi
-- tidak ada cara memisahkan saldo per toko di sisi Xendit. Solusinya:
--
--   1. Semua invoice tetap dibuat dengan satu akun Xendit milik platform
--      (tidak ada header `for-user-id`).
--   2. Setiap pesanan meja yang lunas dicatat sebagai pendapatan toko itu
--      (tabel `table_orders` sudah punya `store_id`).
--   3. Pengelola platform menghitung saldo per toko, lalu mengirim uangnya
--      ke rekening bank yang didaftarkan toko lewat API Disbursement Xendit.
--
-- Jadi pemisahan uang ada di dua lapis: pencatatan (siapa pemilik uangnya)
-- dan pencairan (kapan uangnya dikirim).

-- ─────────────────────────────────────────────────────────────
-- 1. Pengaturan pencairan per toko
-- ─────────────────────────────────────────────────────────────
-- Diisi oleh pemilik toko (Dashboard > On the Table) kecuali fee_percent:
-- potongan platform hanya boleh diubah oleh pengelola platform.
alter table public.stores
  add column if not exists payout_enabled boolean default false,
  add column if not exists payout_bank_code text,
  add column if not exists payout_account_number text,
  add column if not exists payout_account_name text,
  add column if not exists payout_fee_percent numeric(5,2),
  add column if not exists payout_minimum_idr integer default 10000;

comment on column public.stores.payout_enabled is
  'Toko siap menerima pencairan. NULL/false = belum, jadi tidak bisa dicairkan.';

comment on column public.stores.payout_fee_percent is
  'Potongan platform dari omzet toko (persen). NULL = pakai nilai bawaan platform (PAYOUT_FEE_PERCENT).';

comment on column public.stores.payout_minimum_idr is
  'Saldo minimum (Rp) sebelum pencairan dijalankan. Higher = uang lebih lama tertahan di saldo platform.';

-- ─────────────────────────────────────────────────────────────
-- 2. Penanda pesanan yang sudah dialokasikan ke satu pencairan
-- ─────────────────────────────────────────────────────────────
-- NULL = uangnya belum dicairkan.
-- Satu pesanan hanya boleh masuk satu pencairan, jadi uang tidak pernah
-- dikirim dua kali.
alter table public.table_orders
  add column if not exists payout_id uuid;

comment on column public.table_orders.payout_id is
  'Pencairan yang mengambil pesanan ini. NULL = belum dicairkan.';

-- ─────────────────────────────────────────────────────────────
-- 3. Ledger pencairan
-- ─────────────────────────────────────────────────────────────
-- Data rekening tujuan disalin ke sini (tidak dibaca dari `stores` saat
-- menampilkan riwayat): kalau toko mengganti rekeningnya, riwayat pencairan
-- lama tetap harus menunjukkan rekening yang benar-benar dipakai.
create table if not exists public.store_payouts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  -- Kunci idempotensi: sama dengan external_id yang dikirim ke Xendit.
  -- Percobaan kirim ulang memakai external_id yang sama, jadi Xendit
  -- menolaknya dan uang tidak terkirim dua kali.
  external_id text not null unique,
  -- Omzet toko pada periode ini (jumlah subtotal pesanan).
  gross_amount numeric(14,2) not null default 0,
  -- Potongan platform.
  fee_amount numeric(14,2) not null default 0,
  -- Biaya layanan yang dibayar pelanggan; ini pendapatan platform.
  service_fee_amount numeric(14,2) not null default 0,
  -- Nominal yang benar-benar dikirim ke toko (gross - fee).
  amount numeric(14,2) not null default 0,
  order_count integer not null default 0,
  period_start timestamptz not null,
  period_end timestamptz not null,
  -- pending (dibuat) | submitted (sudah dikirim ke Xendit) | paid (sudah
  -- sampai di rekening) | failed (gagal, bisa dicoba ulang).
  status text not null default 'pending',
  xendit_disbursement_id text,
  bank_code text not null,
  account_number text not null,
  account_holder_name text not null,
  failure_reason text,
  submitted_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.store_payouts.status is
  'pending | submitted | paid | failed';

create index if not exists store_payouts_store_created_idx
  on public.store_payouts (store_id, created_at desc);

create index if not exists store_payouts_status_idx
  on public.store_payouts (status, created_at desc);

-- Pencarian saldo: pesanan lunas milik toko yang belum dicairkan.
create index if not exists table_orders_store_payout_idx
  on public.table_orders (store_id, payout_id)
  where status = 'paid';

-- Foreign key pesanan -> pencairan.
-- `add constraint if not exists` tidak ada di PostgreSQL, jadi dicek dulu.
do $fk$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'table_orders_payout_id_fkey'
  ) then
    alter table public.table_orders
      add constraint table_orders_payout_id_fkey
      foreign key (payout_id) references public.store_payouts (id) on delete set null;
  end if;
end;
$fk$;

-- Tidak ada policy sama sekali: hanya service role (server) yang boleh membaca
-- dan menulis. Halaman pencairan mengaksesnya lewat route server.
alter table public.store_payouts enable row level security;
