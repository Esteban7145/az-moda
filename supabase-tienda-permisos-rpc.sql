-- Permisos explícitos para las funciones de la tienda AZ MODA.
-- Evita depender del permiso EXECUTE heredado por PUBLIC.

revoke execute on function public.is_store_admin() from public, anon, authenticated;
grant execute on function public.is_store_admin() to authenticated;

revoke execute on function public.create_store_order(uuid, jsonb, jsonb) from public;
grant execute on function public.create_store_order(uuid, jsonb, jsonb) to anon, authenticated;

revoke execute on function public.get_store_payment_settings() from public;
grant execute on function public.get_store_payment_settings() to anon, authenticated;
