-- 0003_transaction_rpc.sql
--
-- Satu pintu masuk untuk SEMUA transaksi: submit_transaction().
--
-- Kenapa harus di dalam database (temuan C4). Supabase-JS tidak punya API
-- transaksi. Jalur kasir sebelumnya: kurangi stok satu per satu -> unggah bukti
-- -> insert transaksi. Kalau insert-nya gagal, stok sudah berkurang untuk
-- penjualan yang tidak pernah tercatat. Pass sebelumnya menambal itu dengan
-- compare-and-swap + kompensasi manual (restoreStock) -- lebih baik daripada
-- read-modify-write, tapi tetap bukan atomik: proses bisa mati di antara dua
-- panggilan HTTP dan kompensasinya tidak pernah jalan.
--
-- Yang ditutup file ini:
--   C1  harga & total dihitung dari products.price, bukan dari form
--   C2  tidak ada lagi parsing string tampilan untuk menemukan produk
--   C3  stok dikunci (for update) lalu dikurangi -- tidak bisa saling menimpa
--   C4  semua langkah dalam SATU transaksi DB; gagal = rollback total
--   C6  idempotensi lewat client_tx_id: retry antrean offline tidak dobel
--   C8  status 'pending' hanya kalau waiting list dinyalakan
--   C10 jalur Telegram memakai fungsi yang SAMA, jadi ikut mengurangi stok
--   B6  diskon loyalitas digerbangi PRO + pelanggan_enabled + visit_threshold
--
-- Idempoten: aman dijalankan ulang. Tidak ada DROP TABLE, tidak ada perubahan
-- destruktif pada kolom yang sudah ada.

-- =====================================================================
-- transaction_items
-- =====================================================================
-- Sumber kebenaran baru untuk "apa yang terjual". `transactions.product_name`
-- tetap ditulis (struk & dashboard lama membacanya), tapi berhenti jadi
-- satu-satunya rekaman isi transaksi.
create table if not exists public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  parent_item_id uuid references public.transaction_items (id) on delete cascade,
  name text not null,
  unit_price numeric(14, 2) not null default 0,
  qty integer not null default 1,
  line_total numeric(14, 2) not null default 0,
  line_index integer not null default 0,
  sub_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists transaction_items_transaction_idx
  on public.transaction_items (transaction_id, line_index, sub_index);
create index if not exists transaction_items_product_idx
  on public.transaction_items (product_id);

-- =====================================================================
-- transactions.client_tx_id  (idempotensi antrean offline)
-- =====================================================================
alter table public.transactions add column if not exists client_tx_id uuid;

-- Partial: transaksi lama dan jalur yang tidak mengirim id tetap boleh NULL,
-- dan di PostgreSQL banyak NULL tidak melanggar unique. Kolom ini TIDAK dipakai
-- lewat ON CONFLICT, jadi partial index tidak jadi masalah di sini (bandingkan
-- catatan di 0001 soal cashiers_telegram_chat_id_key).
create unique index if not exists transactions_client_tx_id_key
  on public.transactions (client_tx_id)
  where client_tx_id is not null;

-- =====================================================================
-- products: nama unik per toko (case-insensitive)
-- =====================================================================
-- Dipakai untuk mencegah dua produk bernama sama dalam satu toko, yang membuat
-- laporan dan pemilihan produk ambigu. Unique index TIDAK bisa NOT VALID, jadi
-- kalau sudah ada duplikat di data Anda, index-nya dilewati dan Anda diberi
-- daftar yang perlu dirapikan -- migrasi tidak digagalkan karena itu.
do $dup$
declare
  v_dupes text;
begin
  if exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'products_store_name_key'
  ) then
    return;
  end if;

  select string_agg(nama, ', ')
  into v_dupes
  from (
    select lower(name) as nama
    from public.products
    group by store_id, lower(name)
    having count(*) > 1
  ) d;

  if v_dupes is null then
    create unique index products_store_name_key
      on public.products (store_id, lower(name));
  else
    raise notice 'products_store_name_key DILEWATI: masih ada nama produk ganda dalam satu toko (%). Rapikan dulu, lalu jalankan sendiri: create unique index products_store_name_key on public.products (store_id, lower(name));', v_dupes;
  end if;
end
$dup$;

-- =====================================================================
-- RLS: transaction_items
-- =====================================================================
-- Mengikuti pola 0002: pemilik toko boleh membaca, tidak ada jalur tulis dari
-- browser sama sekali (semua penulisan lewat submit_transaction / service-role).
alter table public.transaction_items enable row level security;

drop policy if exists "transaction_items_select_own" on public.transaction_items;
create policy "transaction_items_select_own" on public.transaction_items
  for select to authenticated
  using (
    transaction_id in (
      select t.id from public.transactions t
      where t.store_id in (select s.id from public.stores s where s.user_id = auth.uid())
    )
  );

-- =====================================================================
-- submit_transaction()
-- =====================================================================
-- Mengembalikan jsonb, bukan tabel: satu objek, tanpa kolom OUT yang bisa
-- bertabrakan nama dengan kolom tabel di dalam fungsi, dan sisi aplikasi tidak
-- perlu lagi `Array.isArray(data) ? data[0] : data`.
--
-- Sukses:
--   { ok:true, transaction_id, subtotal, discount_percent, discount, total,
--     cash_received, change_amount, status, product_name, idempotent }
-- Gagal aturan bisnis:
--   { ok:false, error_code, detail?, stock_left?, total? }
--
-- SEMUA pemeriksaan terjadi SEBELUM tulisan pertama, jadi baris gagal tidak
-- pernah meninggalkan perubahan separuh jalan. Kegagalan setelah tulisan
-- pertama hanya bisa lewat `raise`, yang me-rollback seluruh transaksi.
--
-- error_code: invalid_token, invalid_payment_method, empty_items,
-- too_many_items, bad_item, bad_qty, sub_product_required,
-- customer_name_required, receipt_required, product_unavailable,
-- insufficient_stock, invalid_total, cash_insufficient
--
-- p_receipt_url dikirim aplikasi karena unggah ke Supabase Storage tidak bisa
-- dilakukan dari PL/pgSQL. p_customer_phone diharapkan SUDAH dinormalisasi oleh
-- lib/format.js normalizePhone() -- fungsi ini tidak menormalisasi ulang supaya
-- tidak ada dua aturan yang bisa menghasilkan dua baris customers berbeda.
-- p_cash_received NULL untuk CASH berarti "uang pas" (lihat blok tunai di
-- bawah), bukan nol.
-- Selain itu tidak ada satu pun nilai di sini yang berasal dari client.

create or replace function public.submit_transaction(
  p_token text,
  p_items jsonb,
  p_payment_method text,
  p_cash_received numeric default null,
  p_buyer_name text default null,
  p_customer_phone text default null,
  p_client_tx_id uuid default null,
  p_receipt_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_row        record;
  v_flat       jsonb;
  v_resolved   jsonb;
  v_ids        uuid[];
  v_found      integer;
  v_subtotal   numeric := 0;
  v_discount   numeric := 0;
  v_percent    integer := 0;
  v_total      numeric := 0;
  v_cash       numeric;
  v_change     numeric;
  v_status     text;
  v_name_str   text;
  v_detail     text;
  v_stock_left integer;
  v_is_pro     boolean;
  v_loyalty    boolean;
  v_threshold  integer;
  v_configured integer;
  v_visits     integer := 0;
  v_customer   public.customers;
  v_phone      text;
  v_buyer      text;
  v_tx_id      uuid;
  v_base_ids   jsonb;
  v_rows       integer;
  v_distinct   integer;
  v_existing   record;
begin
  -- ------------------------------------------------------------------ token
  -- Satu-satunya kredensial. store_id dan cashier_id TIDAK PERNAH datang dari
  -- client (temuan A1) -- keduanya diturunkan di sini.
  select c.id              as cashier_id,
         s.id              as store_id,
         s.subscription_tier,
         s.subscription_end_date,
         s.pelanggan_enabled,
         s.visit_threshold,
         s.discount_percent,
         s.waiting_list_enabled,
         s.require_sub_product,
         s.require_customer_name,
         s.receipt_required
  into v_row
  from public.cashiers c
  join public.stores s on s.id = c.store_id
  where c.token = p_token
  limit 1;

  -- FOUND, bukan `v_row.cashier_id is null`: mengakses field dari variabel
  -- record yang belum pernah terisi adalah error di PL/pgSQL.
  if not found then
    return jsonb_build_object('ok', false, 'error_code', 'invalid_token');
  end if;

  -- -------------------------------------------------------- idempotensi (C6)
  -- Retry antrean offline memakai client_tx_id yang sama. Tanpa ini, request
  -- yang sudah commit tapi response-nya hilang akan tercatat dua kali dan stok
  -- berkurang dua kali.
  if p_client_tx_id is not null then
    select t.id, t.amount, t.original_amount, t.discount_percent, t.cash_received,
           t.change_amount, t.status, t.product_name
    into v_existing
    from public.transactions t
    where t.client_tx_id = p_client_tx_id
    limit 1;

    if found then
      return jsonb_build_object(
        'ok', true, 'idempotent', true,
        'transaction_id', v_existing.id,
        'subtotal', coalesce(v_existing.original_amount, v_existing.amount),
        'discount_percent', coalesce(v_existing.discount_percent, 0),
        'discount', greatest(coalesce(v_existing.original_amount, v_existing.amount) - v_existing.amount, 0),
        'total', v_existing.amount,
        'cash_received', v_existing.cash_received,
        'change_amount', v_existing.change_amount,
        'status', v_existing.status,
        'product_name', v_existing.product_name
      );
    end if;
  end if;

  if p_payment_method is null or p_payment_method not in ('CASH', 'QRIS/TF') then
    return jsonb_build_object('ok', false, 'error_code', 'invalid_payment_method');
  end if;

  -- ------------------------------------------------------------------ items
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'error_code', 'empty_items');
  end if;
  if jsonb_array_length(p_items) > 50 then
    return jsonb_build_object('ok', false, 'error_code', 'too_many_items');
  end if;

  -- Datar-kan jadi satu baris per produk. sub_index 0 = produk utama, > 0 =
  -- sub-produk milik line_index yang sama. `with ordinality` dipakai supaya
  -- urutannya deterministik (row_number() tanpa ORDER BY tidak dijamin).
  with lines as (
    select l.ord::int as line_index, l.value as val
    from jsonb_array_elements(p_items) with ordinality as l(value, ord)
  ),
  subs as (
    select ln.line_index, s.ord::int as sub_index, s.value as val
    from lines ln
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(ln.val->'subs') = 'array' then ln.val->'subs' else '[]'::jsonb end
    ) with ordinality as s(value, ord)
  )
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'line_index', f.line_index,
               'sub_index', f.sub_index,
               'product_id', f.pid,
               'qty', f.q
             )
             order by f.line_index, f.sub_index
           ),
           '[]'::jsonb
         )
  into v_flat
  from (
    select line_index, 0 as sub_index, val->>'product_id' as pid, val->>'qty' as q from lines
    union all
    select line_index, sub_index, val->>'product_id', val->>'qty' from subs
  ) f;

  if jsonb_array_length(v_flat) > 200 then
    return jsonb_build_object('ok', false, 'error_code', 'too_many_items');
  end if;

  -- product_id wajib UUID. Dicek dengan regex, bukan cast, supaya sampah dari
  -- client jadi error_code yang bisa ditampilkan -- bukan exception 22P02.
  if exists (
    select 1 from jsonb_array_elements(v_flat) e
    where coalesce(e->>'product_id', '') !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    return jsonb_build_object('ok', false, 'error_code', 'bad_item');
  end if;

  -- qty 1..999. CASE, bukan OR: PostgreSQL tidak menjamin urutan evaluasi OR,
  -- jadi `qty !~ '^\d+$' or qty::int < 1` masih bisa meledak di cast-nya.
  if exists (
    select 1 from jsonb_array_elements(v_flat) e
    where case
            when coalesce(e->>'qty', '') ~ '^[0-9]{1,3}$' then (e->>'qty')::int < 1
            else true
          end
  ) then
    return jsonb_build_object('ok', false, 'error_code', 'bad_qty');
  end if;

  -- ------------------------------------------------- aturan toko (B8 aktif)
  if coalesce(v_row.require_sub_product, false) and exists (
    select 1 from jsonb_array_elements(v_flat) e
    where (e->>'sub_index')::int = 0
      and not exists (
        select 1 from jsonb_array_elements(v_flat) e2
        where (e2->>'line_index')::int = (e->>'line_index')::int
          and (e2->>'sub_index')::int > 0
      )
  ) then
    return jsonb_build_object('ok', false, 'error_code', 'sub_product_required');
  end if;

  v_buyer := nullif(btrim(coalesce(p_buyer_name, '')), '');
  if coalesce(v_row.require_customer_name, false) and v_buyer is null then
    return jsonb_build_object('ok', false, 'error_code', 'customer_name_required');
  end if;

  -- Bukti QRIS/TF: aturannya milik toko, jadi diputuskan di sini. Aplikasi
  -- hanya melaporkan apakah ada berkas (lewat p_receipt_url) -- jadi tidak ada
  -- unggahan yang terbuang untuk transaksi yang memang akan ditolak.
  if p_payment_method = 'QRIS/TF'
     and coalesce(v_row.receipt_required, true)
     and p_receipt_url is null then
    return jsonb_build_object('ok', false, 'error_code', 'receipt_required');
  end if;

  -- ------------------------------------------------- kunci & resolve produk
  select array_agg(distinct (e->>'product_id')::uuid)
  into v_ids
  from jsonb_array_elements(v_flat) e;

  -- Kunci baris produk dalam urutan id yang deterministik: dua kasir yang
  -- submit bersamaan mengunci dalam urutan yang sama, jadi tidak saling
  -- deadlock. Setelah baris terkunci, "cek stok lalu kurangi" jadi aman --
  -- inilah yang menggantikan compare-and-swap di sisi aplikasi (temuan C3).
  perform 1
  from public.products p
  where p.store_id = v_row.store_id and p.id = any(v_ids)
  order by p.id
  for update;

  -- Harga SELALU dari products.price, tidak pernah dari form (temuan C1).
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'line_index', (e->>'line_index')::int,
               'sub_index', (e->>'sub_index')::int,
               'product_id', p.id,
               'name', p.name,
               'price', p.price,
               'qty', (e->>'qty')::int
             )
             order by (e->>'line_index')::int, (e->>'sub_index')::int
           ),
           '[]'::jsonb
         ),
         count(*)
  into v_resolved, v_found
  from jsonb_array_elements(v_flat) e
  join public.products p
    on p.id = (e->>'product_id')::uuid
   and p.store_id = v_row.store_id;

  -- Satu id yang tidak ketemu berarti produk milik toko lain, sudah dihapus,
  -- atau dikarang client. Ditolak seluruhnya, bukan dilewati diam-diam (C2).
  if coalesce(v_found, 0) <> jsonb_array_length(v_flat) then
    return jsonb_build_object('ok', false, 'error_code', 'product_unavailable');
  end if;

  -- ------------------------------------------------------------------- stok
  -- Dicek di sini, di atas baris yang sudah terkunci, sebelum ada tulisan apa
  -- pun. Kalau kurang, transaksinya tidak pernah dibuat -- dulu stok bisa
  -- berkurang untuk penjualan yang gagal dicatat (temuan C4).
  select p.name, p.stock
  into v_detail, v_stock_left
  from (
    select (e->>'product_id')::uuid as pid, sum((e->>'qty')::int) as need
    from jsonb_array_elements(v_resolved) e
    group by 1
  ) n
  join public.products p on p.id = n.pid and p.store_id = v_row.store_id
  where p.stock < n.need
  order by p.name
  limit 1;

  if v_detail is not null then
    return jsonb_build_object(
      'ok', false, 'error_code', 'insufficient_stock',
      'detail', v_detail, 'stock_left', v_stock_left
    );
  end if;

  -- -------------------------------------------------------------- subtotal
  select round(coalesce(sum((e->>'price')::numeric * (e->>'qty')::int), 0))
  into v_subtotal
  from jsonb_array_elements(v_resolved) e;

  if v_subtotal <= 0 then
    return jsonb_build_object('ok', false, 'error_code', 'invalid_total');
  end if;

  -- String tampilan dibuat di sini, dari nama produk yang otoritatif. Dulu
  -- string ini dikirim client lalu di-parse ulang server untuk menemukan produk
  -- -- dan parsing itulah yang gagal untuk format aplikasinya sendiri (C2).
  select string_agg(x.txt, ', ' order by x.line_index)
  into v_name_str
  from (
    select (e->>'line_index')::int as line_index,
           (e->>'qty') || 'x ' || (e->>'name') ||
           coalesce(
             ' + ' || (
               select string_agg((s->>'qty') || 'x ' || (s->>'name'), ' + '
                                order by (s->>'sub_index')::int)
               from jsonb_array_elements(v_resolved) s
               where (s->>'line_index')::int = (e->>'line_index')::int
                 and (s->>'sub_index')::int > 0
             ),
             ''
           ) as txt
    from jsonb_array_elements(v_resolved) e
    where (e->>'sub_index')::int = 0
  ) x;

  -- ------------------------------------------------------ loyalitas (B6/C9)
  -- Aturannya sama dengan lib/loyalty.js: PRO yang masih aktif, DAN
  -- pelanggan_enabled, DAN pelanggan teridentifikasi lewat nomor HP, DAN
  -- kunjungan SEBELUM transaksi ini sudah mencapai visit_threshold.
  -- Dulu discount_percent dipakai apa adanya, jadi setiap toko memberi diskon
  -- 10% ke setiap transaksi.
  v_is_pro := v_row.subscription_tier = 'PRO'
    and (v_row.subscription_end_date is null or v_row.subscription_end_date > now());
  v_loyalty := coalesce(v_row.pelanggan_enabled, false) and v_is_pro;
  v_threshold := greatest(1, coalesce(v_row.visit_threshold, 5));
  v_configured := least(100, greatest(0, coalesce(v_row.discount_percent, 10)));

  v_phone := nullif(btrim(coalesce(p_customer_phone, '')), '');
  if v_phone is not null then
    select c.* into v_customer
    from public.customers c
    where c.store_id = v_row.store_id and c.phone = v_phone
    limit 1;
    v_visits := greatest(0, coalesce(v_customer.visit_count, 0));
  end if;

  if v_loyalty and v_visits >= v_threshold and v_configured > 0 then
    v_percent := v_configured;
  else
    v_percent := 0;
  end if;

  v_discount := least(v_subtotal, round(v_subtotal * v_percent / 100.0));
  v_total := greatest(0, v_subtotal - v_discount);

  -- ---------------------------------------------------------------- tunai
  -- p_cash_received NULL berarti "tidak disebutkan" = uang pas, BUKAN nol.
  -- Ini yang membuat laporan lewat bot Telegram tetap bisa ringkas (kasir cukup
  -- menulis itemnya) tanpa membuka celah: total selalu dihitung dari
  -- products.price, jadi tidak ada uang yang bisa dikarang dari sini.
  -- Nol yang dikirim eksplisit tetap diperlakukan sebagai nol.
  if p_payment_method = 'CASH' then
    if p_cash_received is null then
      v_cash := v_total;
    else
      v_cash := p_cash_received;
      if v_cash < v_total then
        return jsonb_build_object(
          'ok', false, 'error_code', 'cash_insufficient', 'total', v_total
        );
      end if;
    end if;
    v_change := v_cash - v_total;
  end if;

  -- status 'pending' HANYA kalau waiting list dipakai (temuan C8). Dulu semua
  -- transaksi masuk 'pending', jadi daftar tunggu menumpuk seluruh riwayat
  -- penjualan -- termasuk penjualan tunai yang sudah lunas.
  v_status := case when coalesce(v_row.waiting_list_enabled, false) then 'pending' else 'completed' end;

  -- ===================================================================
  -- Mulai dari sini semuanya TULISAN. Semua validasi sudah lewat, dan
  -- semuanya dalam satu transaksi DB: satu kegagalan = rollback total.
  -- ===================================================================
  begin
    insert into public.transactions (
      store_id, cashier_id, amount, original_amount, discount_percent,
      product_name, payment_method, receipt_url, cash_received, change_amount,
      status, buyer_name, customer_name, customer_phone, client_tx_id
    ) values (
      v_row.store_id, v_row.cashier_id, v_total, v_subtotal, v_percent,
      v_name_str, p_payment_method, p_receipt_url, v_cash, v_change,
      v_status, v_buyer,
      case when v_phone is not null then coalesce(v_buyer, v_customer.name) else null end,
      v_phone, p_client_tx_id
    )
    returning id into v_tx_id;
  exception when unique_violation then
    -- Dua retry offline yang berbarengan dengan client_tx_id sama: yang satu
    -- sudah menang. Kembalikan transaksinya, jangan buat yang kedua.
    select t.id, t.amount, t.original_amount, t.discount_percent, t.cash_received,
           t.change_amount, t.status, t.product_name
    into v_existing
    from public.transactions t
    where t.client_tx_id = p_client_tx_id
    limit 1;

    if not found then raise; end if;

    return jsonb_build_object(
      'ok', true, 'idempotent', true,
      'transaction_id', v_existing.id,
      'subtotal', coalesce(v_existing.original_amount, v_existing.amount),
      'discount_percent', coalesce(v_existing.discount_percent, 0),
      'discount', greatest(coalesce(v_existing.original_amount, v_existing.amount) - v_existing.amount, 0),
      'total', v_existing.amount,
      'cash_received', v_existing.cash_received,
      'change_amount', v_existing.change_amount,
      'status', v_existing.status,
      'product_name', v_existing.product_name
    );
  end;

  -- Rincian per item: sumber kebenaran baru untuk isi transaksi. Produk utama
  -- dulu supaya sub-produk bisa menunjuk ke parent_item_id-nya.
  with ins as (
    insert into public.transaction_items (
      transaction_id, product_id, name, unit_price, qty, line_total, line_index, sub_index
    )
    select v_tx_id, (e->>'product_id')::uuid, e->>'name', (e->>'price')::numeric,
           (e->>'qty')::int, round((e->>'price')::numeric * (e->>'qty')::int),
           (e->>'line_index')::int, 0
    from jsonb_array_elements(v_resolved) e
    where (e->>'sub_index')::int = 0
    returning id, line_index
  )
  select coalesce(jsonb_object_agg(ins.line_index::text, ins.id), '{}'::jsonb)
  into v_base_ids
  from ins;

  insert into public.transaction_items (
    transaction_id, product_id, parent_item_id, name, unit_price, qty,
    line_total, line_index, sub_index
  )
  select v_tx_id, (e->>'product_id')::uuid,
         (v_base_ids->>(e->>'line_index'))::uuid,
         e->>'name', (e->>'price')::numeric, (e->>'qty')::int,
         round((e->>'price')::numeric * (e->>'qty')::int),
         (e->>'line_index')::int, (e->>'sub_index')::int
  from jsonb_array_elements(v_resolved) e
  where (e->>'sub_index')::int > 0;

  -- ---------------------------------------------------------------- stok --
  -- `stock = stock - qty` dalam satu pernyataan, di atas baris yang sudah
  -- terkunci. Bukan lagi baca-lalu-tulis dari aplikasi (temuan C3), dan
  -- constraint products_stock_non_negative di 0001 jadi jaring terakhir.
  with need as (
    select (e->>'product_id')::uuid as pid, sum((e->>'qty')::int) as qty
    from jsonb_array_elements(v_resolved) e
    group by 1
  )
  update public.products p
  set stock = p.stock - need.qty,
      updated_at = now()
  from need
  where p.id = need.pid
    and p.store_id = v_row.store_id
    and p.stock >= need.qty;

  get diagnostics v_rows = row_count;

  select count(distinct (e->>'product_id'))
  into v_distinct
  from jsonb_array_elements(v_resolved) e;

  if v_rows <> v_distinct then
    -- Tidak seharusnya bisa terjadi: barisnya sudah dikunci FOR UPDATE di atas.
    -- Kalau tetap terjadi, seluruh transaksi di-rollback, termasuk insert
    -- transaksi dan rinciannya. Aplikasi menerjemahkan ini jadi "coba lagi".
    raise exception 'submit_transaction: stok berubah saat transaksi diproses'
      using errcode = 'serialization_failure';
  end if;

  -- ------------------------------------------------------- pelanggan (B7) --
  -- Jalur ini sebelumnya TIDAK PERNAH jalan: form tidak punya field nomor HP,
  -- page.js tidak pernah mengirim propnya, dan POST /api/pelanggan yang
  -- menaikkan visit_count tidak dipanggil dari mana pun -- dashboard pelanggan
  -- selalu kosong. Kunjungan hanya dicatat kalau fitur pelanggannya hidup,
  -- supaya toko GRATIS tidak diam-diam mengumpulkan data pembeli.
  if v_phone is not null and v_loyalty then
    insert into public.customers (store_id, name, phone, visit_count, total_spent)
    values (v_row.store_id, coalesce(v_buyer, v_customer.name, v_phone), v_phone, 1, v_total)
    on conflict (store_id, phone) do update
      set visit_count = customers.visit_count + 1,
          total_spent = customers.total_spent + v_total,
          name = coalesce(nullif(excluded.name, ''), customers.name),
          updated_at = now();
  end if;

  return jsonb_build_object(
    'ok', true, 'idempotent', false,
    'transaction_id', v_tx_id,
    'subtotal', v_subtotal,
    'discount_percent', v_percent,
    'discount', v_discount,
    'total', v_total,
    'cash_received', v_cash,
    'change_amount', v_change,
    'status', v_status,
    'product_name', v_name_str
  );
end
$fn$;

-- Hanya service-role. Fungsi ini menerima token kasir mentah sebagai kredensial,
-- dan seluruh jalur kasir berjalan di server -- tidak ada alasan browser bisa
-- memanggilnya langsung.
revoke all on function public.submit_transaction(text, jsonb, text, numeric, text, text, uuid, text) from public;
grant execute on function public.submit_transaction(text, jsonb, text, numeric, text, text, uuid, text) to service_role;

-- =====================================================================
-- Bersih-bersih: versi lama fungsi ini kalau pernah ada
-- =====================================================================
-- Tidak ada. Fungsi ini baru di 0003; blok ini hanya penanda kalau nanti
-- signature-nya berubah, drop-nya ditulis di sini supaya migrasi tetap idempoten.
