-- 0006_report_rpcs.sql
-- Agregat laporan server-side. Semua rentang setengah-terbuka [p_from, p_to)
-- dan hanya dapat dibaca pemilik toko yang sedang login.

create or replace function public.report_daily_totals(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_payment_method text default null
)
returns table (
  sale_date date,
  transaction_count bigint,
  gross_total numeric,
  cash_total numeric,
  qris_transfer_total numeric,
  average_ticket numeric
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    (t.created_at at time zone 'Asia/Jakarta')::date as sale_date,
    count(*)::bigint as transaction_count,
    coalesce(sum(t.amount), 0)::numeric as gross_total,
    coalesce(sum(t.amount) filter (where t.payment_method = 'CASH'), 0)::numeric as cash_total,
    coalesce(sum(t.amount) filter (where t.payment_method = 'QRIS/TF'), 0)::numeric as qris_transfer_total,
    round(coalesce(avg(t.amount), 0), 0)::numeric as average_ticket
  from public.transactions t
  where t.store_id = p_store_id
    and t.created_at >= p_from
    and t.created_at < p_to
    and p_from < p_to
    and (p_payment_method is null or t.payment_method = p_payment_method)
    and (p_payment_method is null or p_payment_method in ('CASH', 'QRIS/TF'))
    and exists (
      select 1
      from public.stores s
      where s.id = p_store_id and s.user_id = auth.uid()
    )
  group by 1
  order by 1;
$fn$;

create or replace function public.report_top_products(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_payment_method text default null
)
returns table (
  product_id uuid,
  product_name text,
  quantity_sold bigint,
  gross_revenue numeric
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    ti.product_id,
    ti.name as product_name,
    coalesce(sum(ti.qty), 0)::bigint as quantity_sold,
    coalesce(sum(ti.line_total), 0)::numeric as gross_revenue
  from public.transaction_items ti
  join public.transactions t on t.id = ti.transaction_id
  where t.store_id = p_store_id
    and t.created_at >= p_from
    and t.created_at < p_to
    and p_from < p_to
    and (p_payment_method is null or t.payment_method = p_payment_method)
    and (p_payment_method is null or p_payment_method in ('CASH', 'QRIS/TF'))
    and exists (
      select 1 from public.stores s
      where s.id = p_store_id and s.user_id = auth.uid()
    )
  group by ti.product_id, ti.name
  order by quantity_sold desc, gross_revenue desc, product_name
  limit 10;
$fn$;

create or replace function public.report_cashier_performance(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_payment_method text default null
)
returns table (
  cashier_id uuid,
  cashier_name text,
  transaction_count bigint,
  gross_total numeric,
  average_ticket numeric
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    t.cashier_id,
    coalesce(c.name, 'Kasir dihapus') as cashier_name,
    count(*)::bigint as transaction_count,
    coalesce(sum(t.amount), 0)::numeric as gross_total,
    round(coalesce(avg(t.amount), 0), 0)::numeric as average_ticket
  from public.transactions t
  left join public.cashiers c on c.id = t.cashier_id
  where t.store_id = p_store_id
    and t.created_at >= p_from
    and t.created_at < p_to
    and p_from < p_to
    and (p_payment_method is null or t.payment_method = p_payment_method)
    and (p_payment_method is null or p_payment_method in ('CASH', 'QRIS/TF'))
    and exists (
      select 1 from public.stores s
      where s.id = p_store_id and s.user_id = auth.uid()
    )
  group by t.cashier_id, c.name
  order by gross_total desc, transaction_count desc, cashier_name;
$fn$;

create or replace function public.report_payment_split(
  p_store_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_payment_method text default null
)
returns table (
  payment_method text,
  transaction_count bigint,
  gross_total numeric
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    coalesce(t.payment_method, 'LAINNYA') as payment_method,
    count(*)::bigint as transaction_count,
    coalesce(sum(t.amount), 0)::numeric as gross_total
  from public.transactions t
  where t.store_id = p_store_id
    and t.created_at >= p_from
    and t.created_at < p_to
    and p_from < p_to
    and (p_payment_method is null or t.payment_method = p_payment_method)
    and (p_payment_method is null or p_payment_method in ('CASH', 'QRIS/TF'))
    and exists (
      select 1 from public.stores s
      where s.id = p_store_id and s.user_id = auth.uid()
    )
  group by t.payment_method
  order by gross_total desc, payment_method;
$fn$;

-- SECURITY DEFINER melewati RLS, sehingga pemeriksaan auth.uid() di setiap
-- fungsi adalah batas otorisasinya. Tidak ada akses untuk public/anon.
revoke all on function public.report_daily_totals(uuid, timestamptz, timestamptz, text) from public;
revoke all on function public.report_daily_totals(uuid, timestamptz, timestamptz, text) from anon;
grant execute on function public.report_daily_totals(uuid, timestamptz, timestamptz, text) to authenticated;

revoke all on function public.report_top_products(uuid, timestamptz, timestamptz, text) from public;
revoke all on function public.report_top_products(uuid, timestamptz, timestamptz, text) from anon;
grant execute on function public.report_top_products(uuid, timestamptz, timestamptz, text) to authenticated;

revoke all on function public.report_cashier_performance(uuid, timestamptz, timestamptz, text) from public;
revoke all on function public.report_cashier_performance(uuid, timestamptz, timestamptz, text) from anon;
grant execute on function public.report_cashier_performance(uuid, timestamptz, timestamptz, text) to authenticated;

revoke all on function public.report_payment_split(uuid, timestamptz, timestamptz, text) from public;
revoke all on function public.report_payment_split(uuid, timestamptz, timestamptz, text) from anon;
grant execute on function public.report_payment_split(uuid, timestamptz, timestamptz, text) to authenticated;
