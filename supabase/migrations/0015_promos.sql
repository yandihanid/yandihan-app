-- 0015_promos.sql
-- Sistem promo untuk pelanggan

create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  description text,
  type text not null check (type in ('fixed_price', 'percent_discount')),
  -- Untuk fixed_price: harga total promo (dalam rupiah)
  -- Untuk percent_discount: persentase diskon (0-100)
  value numeric(14, 2) not null default 0,
  -- Produk yang termasuk dalam promo (array of product_id)
  product_ids uuid[] not null default '{}',
  -- Batas penggunaan per nomor telepon (null = unlimited)
  usage_limit_per_phone integer,
  -- Status promo
  is_active boolean not null default true,
  -- Periode promo
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promos_store_id_idx on public.promos (store_id);
create index if not exists promos_active_idx on public.promos (store_id, is_active) where is_active = true;

-- Tabel untuk melacak penggunaan promo per nomor telepon
create table if not exists public.promo_usages (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid not null references public.promos (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  phone text not null,
  usage_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (promo_id, phone)
);

create index if not exists promo_usages_promo_id_idx on public.promo_usages (promo_id);
create index if not exists promo_usages_store_phone_idx on public.promo_usages (store_id, phone);

-- RLS untuk promos
alter table public.promos enable row level security;

drop policy if exists "promos_owner_all" on public.promos;
create policy "promos_owner_all" on public.promos
  for all to authenticated
  using (store_id in (select id from public.stores where user_id = auth.uid()))
  with check (store_id in (select id from public.stores where user_id = auth.uid()));

-- RLS untuk promo_usages
alter table public.promo_usages enable row level security;

drop policy if exists "promo_usages_owner_all" on public.promo_usages;
create policy "promo_usages_owner_all" on public.promo_usages
  for all to authenticated
  using (store_id in (select id from public.stores where user_id = auth.uid()))
  with check (store_id in (select id from public.stores where user_id = auth.uid()));

-- Fungsi untuk cek dan catat penggunaan promo
create or replace function public.check_and_use_promo(
  p_promo_id uuid,
  p_store_id uuid,
  p_phone text
)
returns table (
  allowed boolean,
  reason text,
  current_usage integer,
  max_usage integer
)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_promo public.promos;
  v_usage public.promo_usages;
  v_current integer;
  v_max integer;
begin
  -- Ambil data promo
  select * into v_promo
  from public.promos
  where id = p_promo_id and store_id = p_store_id
  for share;

  if not found then
    return query select false, 'Promo tidak ditemukan'::text, 0, 0;
    return;
  end if;

  -- Cek apakah promo aktif
  if not v_promo.is_active then
    return query select false, 'Promo tidak aktif'::text, 0, 0;
    return;
  end if;

  -- Cek periode promo
  if v_promo.starts_at is not null and v_promo.starts_at > now() then
    return query select false, 'Promo belum dimulai'::text, 0, 0;
    return;
  end if;

  if v_promo.ends_at is not null and v_promo.ends_at < now() then
    return query select false, 'Promo sudah berakhir'::text, 0, 0;
    return;
  end if;

  -- Cek batas penggunaan per nomor telepon
  if v_promo.usage_limit_per_phone is not null then
    select * into v_usage
    from public.promo_usages
    where promo_id = p_promo_id and phone = p_phone
    for update;

    v_current := coalesce(v_usage.usage_count, 0);
    v_max := v_promo.usage_limit_per_phone;

    if v_current >= v_max then
      return query select false, 'Batas penggunaan promo tercapai'::text, v_current, v_max;
      return;
    end if;

    -- Increment usage
    if v_usage is null then
      insert into public.promo_usages (promo_id, store_id, phone, usage_count)
      values (p_promo_id, p_store_id, p_phone, 1);
    else
      update public.promo_usages
      set usage_count = usage_count + 1, updated_at = now()
      where promo_id = p_promo_id and phone = p_phone;
    end if;
  else
    v_current := 0;
    v_max := 0; -- unlimited
  end if;

  return query select true, 'OK'::text, v_current + 1, v_max;
end;
$fn$;

revoke all on function public.check_and_use_promo(uuid, uuid, text) from public;
revoke all on function public.check_and_use_promo(uuid, uuid, text) from anon;
revoke all on function public.check_and_use_promo(uuid, uuid, text) from authenticated;
grant execute on function public.check_and_use_promo(uuid, uuid, text) to service_role;