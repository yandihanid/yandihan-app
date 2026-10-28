-- 0019_xendit_sub_accounts.sql
-- Pembayaran On the Table bisa diarahkan ke sub-account Xendit milik tiap toko.
--
-- Sebelumnya semua invoice dibuat dengan XENDIT_SECRET_KEY milik platform dan
-- tanpa header `for-user-id`, jadi uang pelanggan masuk ke akun Xendit utama
-- (milik platform). Pemisahan per toko hanya ada di database (`store_id`).
--
-- Dengan `for-user-id` berisi Business ID sub-account, Xendit membuat invoice
-- atas nama sub-account tersebut dan dananya masuk ke saldo sub-account itu.
-- Kolom di bawah menyimpan Business ID tersebut per toko.
--
-- Catatan operasional: sub-account harus sudah dibuat & disetujui di Xendit
-- (XenPlatform), dan callback invoice sub-account diarahkan ke endpoint
-- /api/payment/xendit/callback aplikasi ini. Kalau callback belum diarahkan,
-- pesanan tetap lunas lewat rekonsiliasi di halaman status pelanggan.

alter table public.stores
  add column if not exists xendit_sub_account_id text;

comment on column public.stores.xendit_sub_account_id is
  'Business ID sub-account Xendit (header for-user-id) untuk pembayaran On the Table. NULL = pakai akun utama.';

-- Nilai for-user-id yang benar-benar dipakai saat invoice dibuat disimpan di
-- pesanan. Kalau pemilik toko mengganti/menghapus sub-account setelah invoice
-- terbit, rekonsiliasi status tetap menanyakan invoice ke akun yang sama.
alter table public.table_orders
  add column if not exists xendit_for_user_id text;

comment on column public.table_orders.xendit_for_user_id is
  'Nilai header for-user-id saat invoice Xendit dibuat. NULL = akun utama.';
