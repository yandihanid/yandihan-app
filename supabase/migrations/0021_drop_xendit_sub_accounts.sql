-- 0021_drop_xendit_sub_accounts.sql
-- Sub-account Xendit (XenPlatform) dibatalkan: pengajuannya tidak
-- disetujui, jadi tidak ada toko yang bisa memakai header `for-user-id`.
--
-- Semua invoice sekarang dibuat dengan akun Xendit utama milik platform.
-- Pemisahan uang per toko tidak lewat sub-account, tapi lewat pencairan
-- (disbursement) yang dikendalikan aplikasi -- lihat 0022_store_payouts.sql.
--
-- Kolom di bawah dihapus supaya tidak ada jalur kode yang masih mengirim
-- `for-user-id`. `if exists` dipakai karena migrasi 0019 belum tentu pernah
-- dijalankan di database yang sama.

alter table public.stores
  drop column if exists xendit_sub_account_id;

alter table public.table_orders
  drop column if exists xendit_for_user_id;
