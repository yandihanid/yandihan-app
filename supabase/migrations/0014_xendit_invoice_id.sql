-- 0014_xendit_invoice_id.sql
-- Tambahkan kolom untuk menyimpan Xendit invoice ID dan update RPC

-- Tambahkan kolom xendit_invoice_id ke subscription_orders
alter table public.subscription_orders add column if not exists xendit_invoice_id text;

-- Update RPC consume_subscription_order untuk menerima parameter Xendit
create or replace function public.consume_subscription_order(
  p_order_id text,
  p_gross_amount numeric,
  p_midtrans_transaction_id text default null,
  p_xendit_invoice_id text default null,
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
        xendit_invoice_id = coalesce(p_xendit_invoice_id, xendit_invoice_id),
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
      xendit_invoice_id = coalesce(p_xendit_invoice_id, xendit_invoice_id),
      midtrans_payload = coalesce(p_payload, midtrans_payload),
      updated_at = now()
  where subscription_orders.order_id = p_order_id;

  return query select true, 'applied'::text, v_order.store_id, v_new_end;
end;
$fn$;

-- Hanya server (service role) yang boleh memanggilnya.
revoke all on function public.consume_subscription_order(text, numeric, text, text, jsonb, integer) from public;
revoke all on function public.consume_subscription_order(text, numeric, text, text, jsonb, integer) from anon;
revoke all on function public.consume_subscription_order(text, numeric, text, text, jsonb, integer) from authenticated;
grant execute on function public.consume_subscription_order(text, numeric, text, text, jsonb, integer) to service_role;