-- 0024_audit_logs.sql
--
-- Tabel audit_logs mencatat tindakan sensitif pemilik toko dan admin platform:
-- rotasi token kasir, tambah/hapus akun kasir, perubahan paket langganan,
-- dan perubahan pengaturan toko penting.
--
-- Tujuan: kepaduan hukum (audit trail) dan deteksi kegiatan mencurigakan.
-- Data ini tidak boleh diubah atau dihapus oleh aplikasi (hanya INSERT).

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  store_id uuid references public.stores(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null, -- mis. 'rotate_cashier_token', 'add_cashier', 'delete_cashier', 'update_store'
  target_type text, -- mis. 'cashier', 'store', 'subscription'
  target_id text, -- ID target yang diubah
  details jsonb default '{}', -- data tambahan (tidak boleh berisi sandi/token mentah)
  ip_address text,
  user_agent text
);

create index if not exists audit_logs_store_id_idx
  on public.audit_logs (store_id, created_at desc);

create index if not exists audit_logs_action_idx
  on public.audit_logs (action);

-- RLS: hanya pemilik toko atau admin platform yang bisa baca log toko mereka.
alter table public.audit_logs enable row level security;

create policy "Pemilik toko bisa baca log toko sendiri"
  on public.audit_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.stores
      where stores.id = audit_logs.store_id
        and stores.user_id = auth.uid()
    )
  );

create policy "Admin platform bisa baca semua log"
  on public.audit_logs for select
  to authenticated
  using (
    current_setting('app.platform_admin', true) = 'true'
  );

-- Hanya service_role yang boleh INSERT (dipanggil dari server action/server).
revoke all on public.audit_logs from public, anon, authenticated;
grant insert on public.audit_logs to service_role;
grant select on public.audit_logs to authenticated;

comment on table public.audit_logs is
  'Catatan tindakan sensitif untuk audit keamanan. Tidak boleh diubah atau dihapus.';

comment on column public.audit_logs.details is
  'Data tambahan terkait aksi. JANGAN menyimpan sandi, token, atau rahasia lain.';
