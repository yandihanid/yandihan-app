-- 0018_on_table_orders.sql
-- Pesanan pelanggan dari QR meja, dicatat SEBELUM dibayar.
--
-- Kenapa tabel terpisah, bukan langsung `transactions` seperti versi sebelumnya:
--   1. Transaksi yang belum dibayar tidak boleh masuk laporan penjualan, KDS,
--      atau antrean kasir.
--   2. Stok baru dikurangi saat pembayaran benar-benar diterima, sehingga
--      pesanan yang ditinggalkan tidak "menghilangkan" stok.
--   3. Nomor antrean baru terbit setelah lunas, sesuai urutan pembayaran.
--
-- `items` menyimpan potret pesanan (nama & harga saat itu) supaya halaman
-- status tetap bisa menampilkan rincian walau katalog berubah.

create table if not exists public.table_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  table_number integer not null,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(14, 2) not null default 0,
  service_fee numeric(14, 2) not null default 0,
  amount numeric(14, 2) not null default 0,
  -- pending | paid | expired | failed | amount_mismatch
  status text not null default 'pending',
  xendit_invoice_id text,
  invoice_url text,
  transaction_id uuid references public.transactions (id) on delete set null,
  queue_number integer,
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists table_orders_store_created_idx
  on public.table_orders (store_id, created_at desc);

create index if not exists table_orders_status_idx
  on public.table_orders (store_id, status, created_at desc);

create unique index if not exists table_orders_invoice_idx
  on public.table_orders (xendit_invoice_id)
  where xendit_invoice_id is not null;

-- Tidak ada policy sama sekali: hanya service role (server) yang boleh membaca
-- dan menulis. Halaman status pelanggan mengaksesnya lewat route server dengan
-- id acak sebagai kunci, bukan langsung dari browser.
alter table public.table_orders enable row level security;

-- =====================================================================
-- Nomor antrean untuk pesanan meja
-- =====================================================================
-- Versi 0008 hanya memberi nomor kalau status = 'pending' DAN
-- stores.waiting_list_enabled = true. Akibatnya pesanan On the Table tidak
-- pernah punya nomor antrean di toko yang tidak memakai fitur waiting list.
--
-- Sekarang: transaksi yang punya `table_number` selalu mendapat nomor antrean,
-- karena nomor itu yang ditunjukkan ke pelanggan setelah membayar.
create or replace function public.assign_fnb_queue_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_date date;
  v_waiting_list_enabled boolean;
  v_is_table_order boolean := new.table_number is not null;
begin
  if new.status is distinct from 'pending' and not v_is_table_order then
    new.queue_date := null;
    new.queue_number := null;
    return new;
  end if;

  if not v_is_table_order then
    select coalesce(s.waiting_list_enabled, false)
      into v_waiting_list_enabled
    from public.stores s
    where s.id = new.store_id
    for share;

    if not coalesce(v_waiting_list_enabled, false) then
      new.queue_date := null;
      new.queue_number := null;
      return new;
    end if;
  end if;

  v_date := (coalesce(new.created_at, now()) at time zone 'Asia/Jakarta')::date;

  if tg_op = 'UPDATE'
     and old.store_id = new.store_id
     and old.queue_date = v_date
     and old.queue_number is not null then
    new.queue_date := old.queue_date;
    new.queue_number := old.queue_number;
    return new;
  end if;

  insert into public.queue_counters (store_id, queue_date, last_number)
  values (new.store_id, v_date, 1)
  on conflict (store_id, queue_date) do update
    set last_number = public.queue_counters.last_number + 1
  returning last_number into new.queue_number;

  new.queue_date := v_date;
  return new;
end;
$fn$;

revoke all on function public.assign_fnb_queue_number()
  from public, anon, authenticated, service_role;

drop trigger if exists transactions_assign_fnb_queue_number on public.transactions;
create trigger transactions_assign_fnb_queue_number
  before insert or update of status, store_id, created_at, table_number
  on public.transactions
  for each row execute function public.assign_fnb_queue_number();
