-- 0002_rls_policies.sql
--
-- Temuan A8: RLS + policy hanya pernah ditulis untuk tabel `customers`
-- (add_loyalty_customers.sql). Tidak ada apa pun untuk stores / products /
-- transactions / cashiers -- padahal beberapa komponen client menulis ke DB
-- langsung dari browser dan HANYA mengandalkan RLS sebagai kontrol akses.
--
-- Model tenant proyek ini: stores.user_id -> auth.uid(). Semua tabel lain
-- diturunkan lewat store_id.
--
-- CATATAN PENTING soal jalur kasir:
-- Kasir TIDAK punya akun. /c/<token> diakses tanpa sesi Supabase, dan seluruh
-- operasinya berjalan lewat service-role key di server (createServiceClient),
-- yang memang MELEWATI RLS. Jadi mengaktifkan RLS di sini tidak mematikan
-- jalur kasir -- selama tidak ada komponen client yang menulis DB langsung.
-- Karena itu WaitingList dipindahkan ke route handler ber-token di pass yang
-- sama dengan migrasi ini (app/api/cashier/waiting-list/route.js).
--
-- Idempoten: setiap policy di-drop dulu, jadi file ini aman dijalankan ulang.

-- =====================================================================
-- stores
-- =====================================================================
alter table public.stores enable row level security;

drop policy if exists "stores_select_own" on public.stores;
create policy "stores_select_own" on public.stores
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "stores_insert_own" on public.stores;
create policy "stores_insert_own" on public.stores
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "stores_update_own" on public.stores;
create policy "stores_update_own" on public.stores
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "stores_delete_own" on public.stores;
create policy "stores_delete_own" on public.stores
  for delete to authenticated
  using (user_id = auth.uid());

-- =====================================================================
-- Helper: apakah store_id ini milik user yang sedang login
-- =====================================================================
-- Dipakai semua policy turunan supaya aturannya ditulis satu kali.
-- stable + security invoker: tetap tunduk pada RLS stores di atas.
create or replace function public.owns_store(target_store_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $fn$
  select exists (
    select 1
    from public.stores s
    where s.id = target_store_id
      and s.user_id = auth.uid()
  );
$fn$;

-- =====================================================================
-- products
-- =====================================================================
alter table public.products enable row level security;

drop policy if exists "products_owner_all" on public.products;
create policy "products_owner_all" on public.products
  for all to authenticated
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

-- =====================================================================
-- transactions
-- =====================================================================
alter table public.transactions enable row level security;

-- Pemilik boleh baca. Realtime di dashboard (RealtimeTransactions.js) memakai
-- policy ini, jadi feed realtime tetap jalan untuk pemilik yang login.
drop policy if exists "transactions_owner_select" on public.transactions;
create policy "transactions_owner_select" on public.transactions
  for select to authenticated
  using (public.owns_store(store_id));

-- Pemilik boleh mengubah status (mis. menutup waiting list dari dashboard).
drop policy if exists "transactions_owner_update" on public.transactions;
create policy "transactions_owner_update" on public.transactions
  for update to authenticated
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

-- Sengaja TIDAK ada policy INSERT/DELETE untuk `authenticated`.
-- Transaksi hanya boleh masuk lewat jalur server (service role / RPC
-- submit_transaction di 0003), supaya harga dan stok tidak pernah ditentukan
-- client. Void/refund belum ada di pass ini, jadi DELETE juga ditutup.

-- =====================================================================
-- cashiers
-- =====================================================================
alter table public.cashiers enable row level security;

drop policy if exists "cashiers_owner_all" on public.cashiers;
create policy "cashiers_owner_all" on public.cashiers
  for all to authenticated
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

-- =====================================================================
-- customers
-- =====================================================================
alter table public.customers enable row level security;

-- Policy lama dari add_loyalty_customers.sql, ditulis ulang dengan helper
-- yang sama supaya aturannya konsisten dengan tabel lain.
drop policy if exists "Owner manage customers" on public.customers;
drop policy if exists "customers_owner_all" on public.customers;
create policy "customers_owner_all" on public.customers
  for all to authenticated
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

-- =====================================================================
-- Verifikasi cepat (jalankan manual, tidak wajib)
-- =====================================================================
-- select relname, relrowsecurity
-- from pg_class
-- where relnamespace = 'public'::regnamespace
--   and relname in ('stores', 'products', 'transactions', 'cashiers', 'customers');
--
-- Semua baris harus relrowsecurity = true.
