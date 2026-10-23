-- 0012_cashier_accounts_single_link.sql
--
-- Satu toko = satu link kasir. Link itu hanya menunjuk ke TOKO, bukan ke
-- seseorang. Setiap orang yang membukanya wajib masuk dengan username dan
-- kata sandi miliknya sendiri.
--
-- Yang disiapkan di sini:
--   * stores.cashier_token          -> token link toko (unik)
--   * cashiers.username/password_hash -> akun kasir untuk login
--   * cashier_sessions              -> sesi login (cookie HttpOnly)
--
-- Catatan penting:
--   * `cashiers.token` dan `cashiers.device_id` TIDAK dipakai lagi sebagai
--     kredensial/link. Kolomnya dibiarkan supaya data lama tidak hilang, tapi
--     aplikasi tidak pernah membacanya untuk otentikasi.
--   * Link lama dipertahankan: untuk tiap toko, cashier_token diisi dari token
--     kasir pertama yang sudah ada. Jadi /c/<token-lama> tetap bisa dibuka,
--     hanya sekarang meminta username + kata sandi.
--   * Kasir lama diberi username otomatis. password_hash sengaja NULL: pemilik
--     toko harus mengatur kata sandi lewat Pengaturan sebelum kasir bisa masuk.

-- =====================================================================
-- 1. Akun kasir
-- =====================================================================
alter table public.cashiers add column if not exists username text;
alter table public.cashiers add column if not exists password_hash text;

-- Username dinormalisasi ke huruf kecil oleh aplikasi. Index memakai
-- lower(username) supaya input lama yang belum ternormalisasi tetap aman.
create unique index if not exists cashiers_store_username_key
  on public.cashiers (store_id, lower(username))
  where username is not null;

-- Isi username untuk kasir lama. Basisnya nama yang disederhanakan; kalau
-- bentrok di toko yang sama, tambahkan angka. Loop dipakai karena aturannya
-- "cari yang pertama belum dipakai" tidak bisa ditulis sebagai satu UPDATE.
do $usr$
declare
  r record;
  base text;
  candidate text;
  suffix int;
begin
  for r in
    select id, store_id, name
    from public.cashiers
    where username is null
    order by created_at asc, id asc
  loop
    base := lower(regexp_replace(coalesce(nullif(trim(r.name), ''), 'kasir'), '[^a-zA-Z0-9]+', '', 'g'));
    if base = '' then
      base := 'kasir';
    end if;
    base := substr(base, 1, 24);
    candidate := base;
    suffix := 0;

    while exists (
      select 1
      from public.cashiers c
      where c.store_id = r.store_id
        and lower(c.username) = candidate
    ) loop
      suffix := suffix + 1;
      candidate := base || suffix::text;
    end loop;

    update public.cashiers
    set username = candidate
    where id = r.id;
  end loop;
end
$usr$;

-- =====================================================================
-- 2. Token link toko
-- =====================================================================
alter table public.stores add column if not exists cashier_token text;

-- Pertahankan link yang sudah beredar: pakai token kasir paling awal sebagai
-- token toko. Toko yang belum punya kasir mendapat token baru.
update public.stores s
set cashier_token = coalesce(
  (
    select c.token
    from public.cashiers c
    where c.store_id = s.id
    order by c.created_at asc, c.id asc
    limit 1
  ),
  public.generate_cashier_token()
)
where s.cashier_token is null;

create unique index if not exists stores_cashier_token_key
  on public.stores (cashier_token)
  where cashier_token is not null;

-- =====================================================================
-- 3. Sesi login kasir
-- =====================================================================
-- Yang disimpan adalah HASH SHA-256 dari token sesi, bukan tokennya. Kalau
-- tabel ini bocor, cookie yang beredar tidak bisa dipakai ulang.
create table if not exists public.cashier_sessions (
  token_hash text primary key,
  cashier_id uuid not null references public.cashiers (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists cashier_sessions_cashier_id_idx
  on public.cashier_sessions (cashier_id);

create index if not exists cashier_sessions_store_id_idx
  on public.cashier_sessions (store_id);

create index if not exists cashier_sessions_expires_at_idx
  on public.cashier_sessions (expires_at);

-- Sesi hanya diakses lewat service role (route handler & server component).
-- Tidak ada policy untuk anon/authenticated: cookie kasir tidak boleh bisa
-- dibaca atau ditulis langsung dari browser.
alter table public.cashier_sessions enable row level security;

-- =====================================================================
-- 4. Bersihkan order langganan yang menggantung
-- =====================================================================
-- Order 'pending' yang tidak pernah dibayar tidak boleh terus terlihat sebagai
-- "menunggu". Aplikasi memanggil fungsi ini saat halaman billing dibuka dan
-- sebelum membuat order baru.
create or replace function public.expire_stale_subscription_orders(
  p_minutes integer default 60
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_count integer;
begin
  update public.subscription_orders
  set status = 'gagal',
      updated_at = now()
  where status = 'pending'
    and created_at < now() - make_interval(mins => greatest(coalesce(p_minutes, 60), 1));

  get diagnostics v_count = row_count;
  return v_count;
end
$fn$;

revoke all on function public.expire_stale_subscription_orders(integer) from public;
grant execute on function public.expire_stale_subscription_orders(integer) to service_role;
