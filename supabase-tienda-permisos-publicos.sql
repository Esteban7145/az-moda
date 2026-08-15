-- Las lecturas públicas solo dependen del estado visible del registro.
-- La política administrativa separada conserva el acceso completo para admins.
drop policy if exists "Public reads active categories" on public.store_categories;
create policy "Public reads active categories"
on public.store_categories for select to anon, authenticated
using (active);

drop policy if exists "Public reads active products" on public.store_products;
create policy "Public reads active products"
on public.store_products for select to anon, authenticated
using (active and stock > 0);

revoke execute on function public.is_store_admin() from public, anon;

-- Función auxiliar del sistema: nunca debe estar expuesta por la API pública.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
