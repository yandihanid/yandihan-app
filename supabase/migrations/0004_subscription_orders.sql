-- 0004_subscription_orders.sql
--
-- Temuan (tinggi): order Midtrans dibuat dengan `PRO-${Date.now()}`, tidak
-- diikat ke toko/user mana pun, dan tidak punya penanda "sudah dipakai".
-- Akibatnya:
--   * order_id mudah ditebak (hanya timestamp milidetik)
--   * webhook mempercayai `metadata.store_id` dari body request
--   * satu pembayaran yang sukses bisa di-verify berulang kali untuk
--     memperpanjang PRO selamanya (replay)
--
-- Tabel ini menjadikan order sebagai catatan server-side: siapa yang membeli,
-- untuk toko mana, berapa, dan apakah sudah dikonsumsi.

create table if not exists public.subscription_orders (
  order_id text primary key,
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(14, 2) not null,
  plan text not null default 'PRO',
  status text not null default 'pending',
  -- Diisi sekali saat langganan benar-benar diperpanjang. Non-null = jangan
  -- pernah diproses lagi, dari webhook maupun dari /api/payment/verify.
  consumed_at timestamptz,
  midtrans_transaction_id text,
  midtrans_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscription_orders_store_idx
  on public.subscription_orders (store_id, created_at desc);
create index if not exists subscription_orders_user_idx
  on public.subscription_orders (user_id, created_at desc);

-- RLS: pemilik boleh MELIHAT riwayat tagihannya sendiri, tapi tidak boleh
-- menulis apa pun. Order hanya dibuat dan dikonsumsi oleh server (service role,
-- yang melewati RLS) -- kalau client bisa insert, batas paket ikut bocor.
alter table public.subscription_orders enable row level security;

drop policy if exists "subscription_orders_owner_select" on public.subscription_orders;
create policy "subscription_orders_owner_select" on public.subscription_orders
  for select to authenticated
  using (user_id = auth.uid());

-- =====================================================================
-- Perpanjang langganan secara atomik + sekali pakai
-- =====================================================================
-- Kenapa jadi fungsi DB, bukan dua query di route handler: /api/payment/verify
-- dan webhook Midtrans bisa tiba bersamaan untuk order yang sama. Tanpa
-- penguncian baris, keduanya lolos cek `consumed_at is null` lalu masing-masing
-- menambah 30 hari.
--
-- `for update` pada select membuat pemanggil kedua menunggu, lalu melihat
-- consumed_at sudah terisi dan tidak melakukan apa pun.
--
-- Perpanjang, jangan timpa: base = max(now(), subscription_end_date lama),
-- supaya pembayaran lebih awal tidak menghanguskan sisa masa aktif.
create or replace function public.consume_subscription_order(
  p_order_id text,
  p_gross_amount numeric,
  p_midtrans_transaction_id text default null,
  p_payload jsonb default null,
  p_days integer default 30
)
returns table (
  applied boolean,
  reason text,
  store_id uuid,
  subscription_end_date timestamptz
)
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_order public.subscription_orders;
  v_new_end timestamptz;
begin
  select * into v_order
  from public.subscription_orders
  where subscription_orders.order_id = p_order_id
  for update;

  if not found then
    return query select false, 'order_not_found'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_order.consumed_at is not null then
    return query
      select false,
             'already_consumed'::text,
             v_order.store_id,
             s.subscription_end_date
      from public.stores s
      where s.id = v_order.store_id;
    return;
  end if;

  -- Jumlah yang dibayar harus sama dengan yang dicatat saat order dibuat.
  if p_gross_amount is null or p_gross_amount <> v_order.amount then
    update public.subscription_orders
    set status = 'amount_mismatch',
        midtrans_payload = coalesce(p_payload, midtrans_payload),
        updated_at = now()
    where subscription_orders.order_id = p_order_id;

    return query select false, 'amount_mismatch'::text, v_order.store_id, null::timestamptz;
    return;
  end if;

  select greatest(now(), coalesce(s.subscription_end_date, now())) + make_interval(days => p_days)
  into v_new_end
  from public.stores s
  where s.id = v_order.store_id;

  update public.stores
  set subscription_tier = 'PRO',
      subscription_end_date = v_new_end,
      updated_at = now()
  where id = v_order.store_id;

  update public.subscription_orders
  set status = 'paid',
      consumed_at = now(),
      midtrans_transaction_id = coalesce(p_midtrans_transaction_id, midtrans_transaction_id),
      midtrans_payload = coalesce(p_payload, midtrans_payload),
      updated_at = now()
  where subscription_orders.order_id = p_order_id;

  return query select true, 'applied'::text, v_order.store_id, v_new_end;
end;
$fn$;

-- Hanya server (service role) yang boleh memanggilnya.
revoke all on function public.consume_subscription_order(text, numeric, text, jsonb, integer) from public;
revoke all on function public.consume_subscription_order(text, numeric, text, jsonb, integer) from anon;
revoke all on function public.consume_subscription_order(text, numeric, text, jsonb, integer) from authenticated;
grant execute on function public.consume_subscription_order(text, numeric, text, jsonb, integer) to service_role;
