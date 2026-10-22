-- 0011_subscription_orders_delete_policy.sql
-- Izinkan pemilik menghapus order langganan miliknya yang belum lunas (status pending/cancel/error)

drop policy if exists "subscription_orders_owner_delete" on public.subscription_orders;
create policy "subscription_orders_owner_delete" on public.subscription_orders
  for delete to authenticated
  using (user_id = auth.uid() and status <> 'paid');
