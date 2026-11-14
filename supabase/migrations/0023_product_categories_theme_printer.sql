-- 0023_product_categories_theme_printer.sql
--
-- Tiga permintaan pemilik toko dalam satu migrasi:
--
--   1. products.category
--      Kategori bebas untuk tiap produk, supaya menu di link kasir dan di
--      On the Table bisa dikelompokkan (Makanan, Minuman, Snack, dst).
--      Nilai NULL berarti "Umum".
--
--   2. stores.theme_color
--      Warna dasar toko. Dulu seluruh aplikasi memakai biru yang ditulis mati
--      di :root (app/globals.css), jadi toko yang branding-nya merah tetap
--      menampilkan tombol biru. Sekarang pemilik memilih sendiri dari
--      Dashboard -> Pengaturan.
--
--   3. stores.receipt_printer + transactions.receipt_print_count
--      Lebar kertas struk (58 mm atau 80 mm) dan penghitung cetakan, supaya
--      struk yang dicetak kedua dari menu Antrean bisa diberi label "COPY".
--
-- Klasifikasi produk utama / sub-produk dihapus: semua produk sekarang produk
-- utama yang boleh langsung dijual. Kolom is_sub_product tetap ada (trigger
-- dan RPC masih memakainya untuk memvalidasi item transaksi), tapi tidak ada
-- lagi baris yang ditandai sebagai tambahan.

alter table public.products add column if not exists category text;

alter table public.stores add column if not exists theme_color text default 'blue';
alter table public.stores add column if not exists receipt_printer text default '58';

alter table public.transactions
  add column if not exists receipt_print_count integer not null default 0;

-- Semua produk jadi produk utama. Sub-produk lama ikut dijadiin produk utama
-- supaya tidak lagi muncul sebagai barang yang "tidak bisa dijual sendiri".
update public.products
set is_sub_product = false
where is_sub_product is distinct from false;

create index if not exists products_store_category_idx
  on public.products (store_id, category);

-- ---------------------------------------------------------------------
-- Penghitung cetak struk
-- ---------------------------------------------------------------------
-- Menaikkan penghitung cetakan harus atomik: kalau dua kasir menekan
-- "Cetak Struk" pada detik yang sama, operasi baca-ubah-tulis di aplikasi
-- bisa menghasilkan angka yang sama dua kali (dan struk kedua tidak jadi
-- berlabel COPY).
--
-- Fungsi ini mengembalikan jsonb berisi penghitung terbaru dan nomor meja
-- pesanan, jadi pemanggil cukup satu panggilan.
create or replace function public.bump_receipt_print_count(
  p_transaction_id uuid,
  p_store_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_count integer;
  v_table_number integer;
begin
  update public.transactions
  set receipt_print_count = coalesce(receipt_print_count, 0) + 1
  where id = p_transaction_id
    and store_id = p_store_id
  returning receipt_print_count, table_number into v_count, v_table_number;

  if v_count is null then
    return jsonb_build_object('print_count', 0, 'table_number', null);
  end if;

  return jsonb_build_object('print_count', v_count, 'table_number', v_table_number);
end
$fn$;

revoke all on function public.bump_receipt_print_count(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.bump_receipt_print_count(uuid, uuid)
  to service_role;

comment on column public.products.category is
  'Kategori menu bebas, misalnya Makanan, Minuman, Snack. NULL = Umum.';

comment on column public.stores.theme_color is
  'Warna dasar toko: blue, green, red, orange, purple, teal, pink, slate.';

comment on column public.stores.receipt_printer is
  'Lebar kertas struk: 58 atau 80 (milimeter).';

comment on column public.transactions.receipt_print_count is
  'Berapa kali struk transaksi ini sudah dicetak dari menu Antrean kasir.';
