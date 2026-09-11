-- 0008_reconcile_transaction_rpc.sql
-- Rekonsiliasi forward-only setelah 0007: invariant item, antrean, dan RPC kanonis.

create or replace function public.assign_fnb_queue_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_date date;
  v_waiting_list_enabled boolean;
begin
  if new.status is distinct from 'pending' then
    new.queue_date := null;
    new.queue_number := null;
    return new;
  end if;

  select coalesce(s.waiting_list_enabled, false)
    into v_waiting_list_enabled
  from public.stores s
  where s.id = new.store_id
  for share;

  if not coalesce(v_waiting_list_enabled, false) then
    new.queue_date := null;
    new.queue_number := null;
    return new;
  end if;

  v_date := (coalesce(new.created_at, now()) at time zone 'Asia/Jakarta')::date;

  if tg_op = 'UPDATE'
     and old.status = 'pending'
     and old.store_id = new.store_id
     and old.queue_date = v_date
     and old.queue_number is not null then
    new.queue_date := old.queue_date;
    new.queue_number := old.queue_number;
    return new;
  end if;

  insert into public.queue_counters (store_id, queue_date, last_number)
  values (new.store_id, v_date, 1)
  on conflict (store_id, queue_date) do update
    set last_number = public.queue_counters.last_number + 1
  returning last_number into new.queue_number;

  new.queue_date := v_date;
  return new;
end
$fn$;

create or replace function public.guard_transaction_owner_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  -- Queue fields are trigger-maintained; compare the rest before that trigger
  -- mutates them. Only a pending -> done status transition is owner-editable.
  if auth.uid() is not null and auth.role() = 'authenticated' then
    if new.store_id is distinct from old.store_id
       or new.cashier_id is distinct from old.cashier_id
       or new.amount is distinct from old.amount
       or new.original_amount is distinct from old.original_amount
       or new.discount_percent is distinct from old.discount_percent
       or new.product_name is distinct from old.product_name
       or new.payment_method is distinct from old.payment_method
       or new.receipt_url is distinct from old.receipt_url
       or new.cash_received is distinct from old.cash_received
       or new.change_amount is distinct from old.change_amount
       or new.buyer_name is distinct from old.buyer_name
       or new.customer_name is distinct from old.customer_name
       or new.customer_phone is distinct from old.customer_phone
       or new.client_tx_id is distinct from old.client_tx_id
       or new.created_at is distinct from old.created_at then
      raise exception using errcode = '42501', message = 'transaction_update_forbidden';
    end if;

    if old.status <> 'pending' or new.status <> 'done' then
      raise exception using errcode = '42501', message = 'transaction_status_invalid';
    end if;
  end if;

  return new;
end
$fn$;

revoke all on function public.guard_transaction_owner_update()
  from public, anon, authenticated, service_role;

drop trigger if exists aa_transactions_guard_owner_update on public.transactions;
drop trigger if exists transactions_guard_owner_update on public.transactions;
create trigger aa_transactions_guard_owner_update
  before update on public.transactions
  for each row execute function public.guard_transaction_owner_update();

-- Jalankan pemeliharaan queue setelah guard di atas, sehingga field queue hanya
-- berubah sebagai akibat status yang memang diizinkan.

revoke all on function public.assign_fnb_queue_number()
  from public, anon, authenticated, service_role;

drop trigger if exists transactions_assign_fnb_queue_number on public.transactions;
create trigger transactions_assign_fnb_queue_number
  before insert or update of status, store_id, created_at on public.transactions
  for each row execute function public.assign_fnb_queue_number();

create index if not exists transactions_store_queue_status_number_idx
  on public.transactions (store_id, queue_date, status, queue_number);

create index if not exists transaction_items_parent_item_idx
  on public.transaction_items (parent_item_id);

-- Bersihkan baris antrean anomali yang mungkin dibuat trigger 0007 ketika
-- queue_number diberikan tanpa queue_date. Tanpa tanggal operasional, nomor itu
-- tidak dapat ditampilkan atau direkonsiliasi secara aman.
update public.transactions
set queue_number = null
where queue_number is not null
  and queue_date is null;

-- 0007 mengizinkan import memberikan queue_number sendiri tanpa menaikkan
-- counter. Selaraskan counter lebih dulu agar alokasi berikutnya tidak mencoba
-- memakai nomor yang sudah ada.
insert into public.queue_counters (store_id, queue_date, last_number)
select t.store_id, t.queue_date, max(t.queue_number)
from public.transactions t
where t.queue_date is not null
  and t.queue_number is not null
group by t.store_id, t.queue_date
on conflict (store_id, queue_date) do update
  set last_number = greatest(
    public.queue_counters.last_number,
    excluded.last_number
  );

do $validate_legacy_items$
declare
  v_bad uuid;
begin
  select i.id into v_bad
  from public.transaction_items i
  join public.transactions t on t.id = i.transaction_id
  left join public.products p on p.id = i.product_id
  left join public.transaction_items parent on parent.id = i.parent_item_id
  where (i.parent_item_id is null and i.sub_index <> 0)
     or (i.parent_item_id is not null and (
       i.sub_index <= 0
       or parent.id is null
       or parent.transaction_id <> i.transaction_id
       or parent.parent_item_id is not null
       or parent.sub_index <> 0
       or parent.line_index <> i.line_index
     ))
     or (p.id is not null and (
       p.store_id <> t.store_id
       or (i.parent_item_id is null and p.is_sub_product)
       or (i.parent_item_id is not null and not p.is_sub_product)
     ))
  limit 1;

  if v_bad is not null then
    raise exception '0008: transaction_items lama melanggar invariant katalog/parent (contoh id: %)', v_bad;
  end if;
end
$validate_legacy_items$;

create or replace function public.validate_transaction_item_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_is_sub boolean;
  v_product_store uuid;
  v_transaction_store uuid;
  v_parent_transaction uuid;
  v_parent_parent uuid;
  v_parent_sub_index integer;
  v_parent_line_index integer;
begin
  select t.store_id into v_transaction_store
  from public.transactions t
  where t.id = new.transaction_id
  for share;

  if v_transaction_store is null then
    raise exception using errcode = 'P0001', message = 'transaction_unavailable';
  end if;

  if new.product_id is not null then
    select p.is_sub_product, p.store_id
      into v_is_sub, v_product_store
    from public.products p
    where p.id = new.product_id
    for share;

    if v_product_store is null or v_product_store <> v_transaction_store then
      raise exception using errcode = 'P0001', message = 'catalog_product_unavailable';
    end if;

    if new.parent_item_id is null and v_is_sub then
      raise exception using errcode = 'P0001', message = 'sub_product_as_main';
    end if;

    if new.parent_item_id is not null and not v_is_sub then
      raise exception using errcode = 'P0001', message = 'main_product_as_sub';
    end if;
  end if;

  if new.parent_item_id is null then
    if new.sub_index <> 0 then
      raise exception using errcode = 'P0001', message = 'item_parent_invalid';
    end if;
  else
    if new.parent_item_id = new.id or new.sub_index <= 0 then
      raise exception using errcode = 'P0001', message = 'item_parent_invalid';
    end if;

    select p.transaction_id, p.parent_item_id, p.sub_index, p.line_index
      into v_parent_transaction, v_parent_parent, v_parent_sub_index,
           v_parent_line_index
    from public.transaction_items p
    where p.id = new.parent_item_id
    for share;

    if v_parent_transaction is null
       or v_parent_transaction <> new.transaction_id
       or v_parent_parent is not null
       or v_parent_sub_index <> 0
       or new.line_index <> v_parent_line_index then
      raise exception using errcode = 'P0001', message = 'item_parent_transaction_mismatch';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and (
       new.transaction_id is distinct from old.transaction_id
       or new.parent_item_id is distinct from old.parent_item_id
       or new.sub_index is distinct from old.sub_index
       or new.line_index is distinct from old.line_index
       or new.product_id is distinct from old.product_id
     )
     and exists (
       select 1 from public.transaction_items c
       where c.parent_item_id = new.id
     ) then
    raise exception using errcode = 'P0001', message = 'item_parent_transaction_mismatch';
  end if;

  return new;
end
$fn$;

revoke all on function public.validate_transaction_item_type()
  from public, anon, authenticated, service_role;

drop trigger if exists transaction_items_validate_catalog_type on public.transaction_items;
create trigger transaction_items_validate_catalog_type
  before insert or update on public.transaction_items
  for each row execute function public.validate_transaction_item_type();

create or replace function public.submit_transaction(
  p_token text,
  p_items jsonb,
  p_payment_method text,
  p_cash_received numeric default null,
  p_buyer_name text default null,
  p_customer_phone text default null,
  p_client_tx_id uuid default null,
  p_receipt_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_row record;
  v_flat jsonb;
  v_resolved jsonb;
  v_ids uuid[];
  v_found integer;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_percent integer := 0;
  v_total numeric := 0;
  v_cash numeric;
  v_change numeric;
  v_status text;
  v_name_str text;
  v_detail text;
  v_stock_left integer;
  v_is_pro boolean;
  v_loyalty boolean;
  v_threshold integer;
  v_configured integer;
  v_visits integer := 0;
  v_customer public.customers;
  v_phone text;
  v_buyer text;
  v_tx_id uuid;
  v_queue_number integer;
  v_base_ids jsonb;
  v_rows integer;
  v_existing record;
  v_constraint text;
  v_cashier_id uuid;
  v_store_id uuid;
begin
  select c.id, c.store_id
    into v_cashier_id, v_store_id
  from public.cashiers c
  where c.token = p_token
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error_code', 'invalid_token');
  end if;

  -- Semua submit mengunci store lalu cashier dalam urutan yang sama. Verifikasi
  -- token diulang saat row cashier sudah terkunci agar lookup awal bukan sumber
  -- otorisasi bila relasi kasir berubah di tengah request.
  select v_cashier_id as cashier_id, s.id as store_id,
         s.subscription_tier, s.subscription_end_date,
         s.pelanggan_enabled, s.visit_threshold, s.discount_percent,
         s.waiting_list_enabled, s.require_sub_product,
         s.require_customer_name, s.receipt_required
    into v_row
  from public.stores s
  where s.id = v_store_id
  for share;

  if not found then
    return jsonb_build_object('ok', false, 'error_code', 'invalid_token');
  end if;

  perform 1
  from public.cashiers c
  where c.id = v_cashier_id
    and c.store_id = v_store_id
    and c.token = p_token
  for share;

  if not found then
    return jsonb_build_object('ok', false, 'error_code', 'invalid_token');
  end if;

  if p_client_tx_id is not null then
    -- Serialisasikan retry ID yang sama sebelum lookup pertama. Ini memastikan
    -- request kedua melihat hasil commit request pertama, bukan menjalankan
    -- validasi/stock path dari snapshot yang sudah tertinggal.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext('submit_transaction'),
      pg_catalog.hashtext(p_client_tx_id::text)
    );

    select t.id, t.store_id, t.amount, t.original_amount,
           t.discount_percent, t.cash_received, t.change_amount,
           t.status, t.product_name, t.queue_number
    into v_existing
    from public.transactions t
    where t.client_tx_id = p_client_tx_id
    limit 1;

    if found then
      if v_existing.store_id <> v_row.store_id then
        return jsonb_build_object('ok', false, 'error_code', 'client_tx_id_conflict');
      end if;
      return jsonb_build_object(
        'ok', true, 'idempotent', true,
        'transaction_id', v_existing.id,
        'subtotal', coalesce(v_existing.original_amount, v_existing.amount),
        'discount_percent', coalesce(v_existing.discount_percent, 0),
        'discount', greatest(coalesce(v_existing.original_amount, v_existing.amount) - v_existing.amount, 0),
        'total', v_existing.amount,
        'cash_received', v_existing.cash_received,
        'change_amount', v_existing.change_amount,
        'status', v_existing.status,
        'queue_number', v_existing.queue_number,
        'product_name', v_existing.product_name
      );
    end if;
  end if;

  if p_payment_method is null or p_payment_method not in ('CASH', 'QRIS/TF') then
    return jsonb_build_object('ok', false, 'error_code', 'invalid_payment_method');
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'error_code', 'empty_items');
  end if;
  if jsonb_array_length(p_items) > 50 then
    return jsonb_build_object('ok', false, 'error_code', 'too_many_items');
  end if;

  with lines as (
    select l.ord::int as line_index, l.value as val
    from jsonb_array_elements(p_items) with ordinality as l(value, ord)
  ),
  subs as (
    select ln.line_index, s.ord::int as sub_index, s.value as val
    from lines ln
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(ln.val->'subs') = 'array'
        then ln.val->'subs' else '[]'::jsonb end
    ) with ordinality as s(value, ord)
  )
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'line_index', f.line_index, 'sub_index', f.sub_index,
      'product_id', f.pid, 'qty', f.q
    ) order by f.line_index, f.sub_index), '[]'::jsonb
  )
  into v_flat
  from (
    select line_index, 0 as sub_index, val->>'product_id' as pid,
           val->>'qty' as q from lines
    union all
    select line_index, sub_index, val->>'product_id', val->>'qty' from subs
  ) f;

  if jsonb_array_length(v_flat) > 200 then
    return jsonb_build_object('ok', false, 'error_code', 'too_many_items');
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_flat) e
    where coalesce(e->>'product_id', '') !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    return jsonb_build_object('ok', false, 'error_code', 'bad_item');
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_flat) e
    where case
      when coalesce(e->>'qty', '') ~ '^[0-9]{1,3}$'
        then (e->>'qty')::int < 1
      else true
    end
  ) then
    return jsonb_build_object('ok', false, 'error_code', 'bad_qty');
  end if;

  if coalesce(v_row.require_sub_product, false) and exists (
    select 1 from jsonb_array_elements(v_flat) e
    where (e->>'sub_index')::int = 0
      and not exists (
        select 1 from jsonb_array_elements(v_flat) e2
        where (e2->>'line_index')::int = (e->>'line_index')::int
          and (e2->>'sub_index')::int > 0
      )
  ) then
    return jsonb_build_object('ok', false, 'error_code', 'sub_product_required');
  end if;

  v_buyer := nullif(btrim(coalesce(p_buyer_name, '')), '');
  if coalesce(v_row.require_customer_name, false) and v_buyer is null then
    return jsonb_build_object('ok', false, 'error_code', 'customer_name_required');
  end if;

  if p_payment_method = 'QRIS/TF'
     and coalesce(v_row.receipt_required, true)
     and p_receipt_url is null then
    return jsonb_build_object('ok', false, 'error_code', 'receipt_required');
  end if;

  select array_agg(distinct (e->>'product_id')::uuid)
  into v_ids
  from jsonb_array_elements(v_flat) e;

  -- Resolve data katalog dari row yang sudah terkunci. Satu statement ini
  -- menjadi snapshot otoritatif untuk harga, nama, jenis, dan stok.
  with locked_products as materialized (
    select p.id, p.name, p.price, p.stock, p.is_sub_product
    from public.products p
    where p.store_id = v_row.store_id
      and p.id = any(v_ids)
    order by p.id
    for update
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'line_index', (e->>'line_index')::int,
           'sub_index', (e->>'sub_index')::int,
           'product_id', p.id, 'name', p.name, 'price', p.price,
           'stock', p.stock, 'qty', (e->>'qty')::int,
           'is_sub_product', p.is_sub_product
         ) order by (e->>'line_index')::int, (e->>'sub_index')::int), '[]'::jsonb),
         count(*)
  into v_resolved, v_found
  from jsonb_array_elements(v_flat) e
  join locked_products p on p.id = (e->>'product_id')::uuid;

  if coalesce(v_found, 0) <> jsonb_array_length(v_flat) then
    return jsonb_build_object('ok', false, 'error_code', 'product_unavailable');
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_resolved) e
    where (e->>'sub_index')::int = 0
      and coalesce((e->>'is_sub_product')::boolean, false)
  ) then
    return jsonb_build_object('ok', false, 'error_code', 'sub_product_as_main');
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_resolved) e
    where (e->>'sub_index')::int > 0
      and not coalesce((e->>'is_sub_product')::boolean, false)
  ) then
    return jsonb_build_object('ok', false, 'error_code', 'main_product_as_sub');
  end if;

  select e->>'name', (e->>'stock')::integer
  into v_detail, v_stock_left
  from jsonb_array_elements(v_resolved) e
  join (
    select n.pid, n.need
    from (
      select (x->>'product_id')::uuid as pid, sum((x->>'qty')::int) as need
      from jsonb_array_elements(v_resolved) x
      group by 1
    ) n
  ) needed on needed.pid = (e->>'product_id')::uuid
  where (e->>'stock')::integer < needed.need
  order by e->>'name'
  limit 1;

  if v_detail is not null then
    return jsonb_build_object(
      'ok', false, 'error_code', 'insufficient_stock',
      'detail', v_detail, 'stock_left', v_stock_left
    );
  end if;

  select round(coalesce(sum((e->>'price')::numeric * (e->>'qty')::int), 0))
  into v_subtotal
  from jsonb_array_elements(v_resolved) e;

  if v_subtotal <= 0 then
    return jsonb_build_object('ok', false, 'error_code', 'invalid_total');
  end if;

  select string_agg(x.txt, ', ' order by x.line_index)
  into v_name_str
  from (
    select (e->>'line_index')::int as line_index,
           (e->>'qty') || 'x ' || (e->>'name') ||
           coalesce(' + ' || (
             select string_agg((s->>'qty') || 'x ' || (s->>'name'), ' + '
                               order by (s->>'sub_index')::int)
             from jsonb_array_elements(v_resolved) s
             where (s->>'line_index')::int = (e->>'line_index')::int
               and (s->>'sub_index')::int > 0
           ), '') as txt
    from jsonb_array_elements(v_resolved) e
    where (e->>'sub_index')::int = 0
  ) x;

  v_is_pro := v_row.subscription_tier = 'PRO'
    and (v_row.subscription_end_date is null or v_row.subscription_end_date > now());
  v_loyalty := coalesce(v_row.pelanggan_enabled, false) and v_is_pro;
  v_threshold := greatest(1, coalesce(v_row.visit_threshold, 5));
  v_configured := least(100, greatest(0, coalesce(v_row.discount_percent, 10)));

  v_phone := nullif(btrim(coalesce(p_customer_phone, '')), '');
  if v_phone is not null then
    -- FOR UPDATE tidak mengunci pelanggan yang belum punya baris. Kunci logis
    -- ini membuat hitungan kunjungan/diskon pelanggan sama-store tetap berurutan.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtext(v_row.store_id::text),
      pg_catalog.hashtext(v_phone)
    );

    select c.* into v_customer
    from public.customers c
    where c.store_id = v_row.store_id and c.phone = v_phone
    limit 1
    for update;
    v_visits := greatest(0, coalesce(v_customer.visit_count, 0));
  end if;

  if v_loyalty and v_visits >= v_threshold and v_configured > 0 then
    v_percent := v_configured;
  else
    v_percent := 0;
  end if;

  v_discount := least(v_subtotal, round(v_subtotal * v_percent / 100.0));
  v_total := greatest(0, v_subtotal - v_discount);

  if p_payment_method = 'CASH' then
    if p_cash_received is null then
      v_cash := v_total;
    else
      v_cash := p_cash_received;
      if v_cash < v_total then
        return jsonb_build_object(
          'ok', false, 'error_code', 'cash_insufficient', 'total', v_total
        );
      end if;
    end if;
    v_change := v_cash - v_total;
  end if;

  v_status := case when coalesce(v_row.waiting_list_enabled, false)
    then 'pending' else 'completed' end;

  begin
    insert into public.transactions (
      store_id, cashier_id, amount, original_amount, discount_percent,
      product_name, payment_method, receipt_url, cash_received, change_amount,
      status, buyer_name, customer_name, customer_phone, client_tx_id
    ) values (
      v_row.store_id, v_row.cashier_id, v_total, v_subtotal, v_percent,
      v_name_str, p_payment_method, p_receipt_url, v_cash, v_change,
      v_status, v_buyer,
      case when v_phone is not null then coalesce(v_buyer, v_customer.name) else null end,
      v_phone, p_client_tx_id
    )
    returning id, queue_number into v_tx_id, v_queue_number;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if p_client_tx_id is null or v_constraint <> 'transactions_client_tx_id_key' then
      raise;
    end if;

    select t.id, t.store_id, t.amount, t.original_amount,
           t.discount_percent, t.cash_received, t.change_amount,
           t.status, t.product_name, t.queue_number
    into v_existing
    from public.transactions t
    where t.client_tx_id = p_client_tx_id
    limit 1;

    if not found then raise; end if;
    if v_existing.store_id <> v_row.store_id then
      return jsonb_build_object('ok', false, 'error_code', 'client_tx_id_conflict');
    end if;

    return jsonb_build_object(
      'ok', true, 'idempotent', true,
      'transaction_id', v_existing.id,
      'subtotal', coalesce(v_existing.original_amount, v_existing.amount),
      'discount_percent', coalesce(v_existing.discount_percent, 0),
      'discount', greatest(coalesce(v_existing.original_amount, v_existing.amount) - v_existing.amount, 0),
      'total', v_existing.amount,
      'cash_received', v_existing.cash_received,
      'change_amount', v_existing.change_amount,
      'status', v_existing.status,
      'queue_number', v_existing.queue_number,
      'product_name', v_existing.product_name
    );
  end;

  with ins as (
    insert into public.transaction_items (
      transaction_id, product_id, name, unit_price, qty,
      line_total, line_index, sub_index
    )
    select v_tx_id, (e->>'product_id')::uuid, e->>'name',
           (e->>'price')::numeric, (e->>'qty')::int,
           round((e->>'price')::numeric * (e->>'qty')::int),
           (e->>'line_index')::int, 0
    from jsonb_array_elements(v_resolved) e
    where (e->>'sub_index')::int = 0
    returning id, line_index
  )
  select coalesce(jsonb_object_agg(ins.line_index::text, ins.id), '{}'::jsonb)
  into v_base_ids
  from ins;

  insert into public.transaction_items (
    transaction_id, product_id, parent_item_id, name, unit_price, qty,
    line_total, line_index, sub_index
  )
  select v_tx_id, (e->>'product_id')::uuid,
         (v_base_ids->>(e->>'line_index'))::uuid,
         e->>'name', (e->>'price')::numeric, (e->>'qty')::int,
         round((e->>'price')::numeric * (e->>'qty')::int),
         (e->>'line_index')::int, (e->>'sub_index')::int
  from jsonb_array_elements(v_resolved) e
  where (e->>'sub_index')::int > 0;

  with need as (
    select (e->>'product_id')::uuid as pid, sum((e->>'qty')::int) as qty
    from jsonb_array_elements(v_resolved) e
    group by 1
  )
  update public.products p
  set stock = p.stock - need.qty,
      updated_at = now()
  from need
  where p.id = need.pid
    and p.store_id = v_row.store_id
    and p.stock >= need.qty;

  get diagnostics v_rows = row_count;

  if v_rows <> coalesce(cardinality(v_ids), 0) then
    raise exception 'submit_transaction: stok berubah saat transaksi diproses'
      using errcode = 'serialization_failure';
  end if;

  if v_phone is not null and v_loyalty then
    insert into public.customers (store_id, name, phone, visit_count, total_spent)
    values (
      v_row.store_id, coalesce(v_buyer, v_customer.name, v_phone),
      v_phone, 1, v_total
    )
    on conflict (store_id, phone) do update
      set visit_count = customers.visit_count + 1,
          total_spent = customers.total_spent + v_total,
          name = coalesce(nullif(excluded.name, ''), customers.name),
          updated_at = now();
  end if;

  return jsonb_build_object(
    'ok', true, 'idempotent', false,
    'transaction_id', v_tx_id,
    'subtotal', v_subtotal,
    'discount_percent', v_percent,
    'discount', v_discount,
    'total', v_total,
    'cash_received', v_cash,
    'change_amount', v_change,
    'status', v_status,
    'queue_number', v_queue_number,
    'product_name', v_name_str
  );
end
$fn$;

revoke all on function public.submit_transaction(
  text, jsonb, text, numeric, text, text, uuid, text
) from public, anon, authenticated, service_role;
grant execute on function public.submit_transaction(
  text, jsonb, text, numeric, text, text, uuid, text
) to service_role;

drop function if exists public.submit_transaction_core(
  text, jsonb, text, numeric, text, text, uuid, text
);
