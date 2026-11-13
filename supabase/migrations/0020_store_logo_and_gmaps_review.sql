-- 0020_store_logo_and_gmaps_review.sql
--
-- Dua setelan baru untuk tabel `stores`:
--
--   1. logo_url        -> logo usaha. Dipakai di struk digital, layar kasir,
--                         dan halaman pesan meja (On the Table).
--   2. gmaps_review_*  -> link rating Google Maps + catatan untuk pelanggan.
--                         Kalau gmaps_review_url kosong, tidak ada pop up
--                         rating yang muncul setelah pembayaran.
--
-- Ketiganya nullable: toko yang belum mengisinya tetap punya baris yang valid,
-- dan tidak ada data lama yang perlu dimigrasikan.

alter table public.stores add column if not exists logo_url text;
alter table public.stores add column if not exists gmaps_review_url text;
alter table public.stores add column if not exists gmaps_review_note text;

comment on column public.stores.logo_url is
  'Logo usaha (data URL hasil kompres di browser atau URL http/https). Tampil di struk dan layar kasir.';

comment on column public.stores.gmaps_review_url is
  'Link rating Google Maps toko. Kosong = pop up rating tidak ditampilkan.';

comment on column public.stores.gmaps_review_note is
  'Catatan singkat yang ditampilkan di pop up rating, misalnya hadiah untuk pelanggan yang memberi rating.';
