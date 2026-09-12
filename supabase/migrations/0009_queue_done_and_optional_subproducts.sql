-- 0009_queue_done_and_optional_subproducts.sql
-- Pertahankan identitas antrean setelah selesai dan jadikan subproduk opsional.

update public.stores
set require_sub_product = false
where require_sub_product is distinct from false;

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
  -- Tiket yang selesai harus tetap membawa tanggal dan nomor antrean asal agar
  -- tab Selesai dapat memuat riwayat operasional hari yang sama.
  if tg_op = 'UPDATE'
     and old.status = 'pending'
     and new.status = 'done'
     and old.store_id = new.store_id
     and old.queue_date is not null
     and old.queue_number is not null then
    new.queue_date := old.queue_date;
    new.queue_number := old.queue_number;
    return new;
  end if;

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

revoke all on function public.assign_fnb_queue_number()
  from public, anon, authenticated, service_role;
