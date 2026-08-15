-- Ajustes finales de seguridad y rendimiento para la tienda AZ MODA.

-- Estas funciones solo deben ejecutarse como disparadores internos.
revoke execute on function public.reserve_paid_order_stock() from public, anon, authenticated;
revoke execute on function public.enforce_store_order_status_flow() from public, anon, authenticated;

-- La comprobacion administrativa no necesita estar disponible para visitantes anonimos.
revoke execute on function public.is_store_admin() from anon;

drop policy if exists "Admins see own access" on public.admin_users;
create policy "Admins see own access"
on public.admin_users
for select
to authenticated
using (user_id = (select auth.uid()));

create index if not exists store_order_items_product_id_idx
on public.store_order_items(product_id);
