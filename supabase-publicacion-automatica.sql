-- Ejecutar una vez en Supabase > SQL Editor.
drop policy if exists "Enviar reseñas pendientes" on public.resenas;
drop policy if exists "Publicar reseñas directamente" on public.resenas;

create policy "Publicar reseñas directamente"
on public.resenas for insert to anon, authenticated
with check (aprobada = true);

-- Hace visibles también las reseñas que ya estaban pendientes.
update public.resenas set aprobada = true where aprobada = false;
