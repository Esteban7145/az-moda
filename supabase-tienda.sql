-- Tienda AZ MODA: catálogo, pedidos, transferencias y administración.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.store_categories(id),
  name text not null,
  slug text not null unique,
  description text not null,
  price_cop numeric(12,0) not null check (price_cop >= 0),
  image_url text,
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default false,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id smallint primary key default 1 check (id = 1),
  transfers_enabled boolean not null default false,
  bank_name text,
  account_type text,
  account_number text,
  account_holder text,
  holder_document text,
  updated_at timestamptz not null default now()
);

create table if not exists public.store_orders (
  id uuid primary key,
  customer_name text not null,
  customer_whatsapp text not null,
  customer_email text not null,
  city text not null,
  address text not null,
  notes text,
  subtotal_cop numeric(12,0) not null check (subtotal_cop >= 0),
  total_cop numeric(12,0) not null check (total_cop >= 0),
  payment_method text not null default 'bank_transfer' check (payment_method = 'bank_transfer'),
  payment_proof_path text,
  status text not null default 'pending_payment' check (status in ('pending_payment','payment_submitted','payment_confirmed','in_preparation','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid references public.store_products(id) on delete set null,
  product_name text not null,
  unit_price_cop numeric(12,0) not null check (unit_price_cop >= 0),
  quantity integer not null check (quantity > 0),
  size text,
  color text,
  created_at timestamptz not null default now()
);

create index if not exists store_products_category_active_idx on public.store_products(category_id, active);
create index if not exists store_products_created_at_idx on public.store_products(created_at desc);
create index if not exists store_orders_created_at_idx on public.store_orders(created_at desc);
create index if not exists store_orders_status_idx on public.store_orders(status);
create index if not exists store_order_items_order_id_idx on public.store_order_items(order_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_store_categories_updated_at on public.store_categories;
create trigger set_store_categories_updated_at before update on public.store_categories
for each row execute function public.set_updated_at();
drop trigger if exists set_store_products_updated_at on public.store_products;
create trigger set_store_products_updated_at before update on public.store_products
for each row execute function public.set_updated_at();
drop trigger if exists set_store_orders_updated_at on public.store_orders;
create trigger set_store_orders_updated_at before update on public.store_orders
for each row execute function public.set_updated_at();
drop trigger if exists set_store_settings_updated_at on public.store_settings;
create trigger set_store_settings_updated_at before update on public.store_settings
for each row execute function public.set_updated_at();

create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

alter table public.admin_users enable row level security;
alter table public.store_categories enable row level security;
alter table public.store_products enable row level security;
alter table public.store_settings enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_order_items enable row level security;

drop policy if exists "Admins see own access" on public.admin_users;
create policy "Admins see own access" on public.admin_users for select to authenticated using (user_id = auth.uid());

drop policy if exists "Public reads active categories" on public.store_categories;
create policy "Public reads active categories" on public.store_categories for select to anon, authenticated using (active or public.is_store_admin());
drop policy if exists "Admins manage categories" on public.store_categories;
create policy "Admins manage categories" on public.store_categories for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

drop policy if exists "Public reads active products" on public.store_products;
create policy "Public reads active products" on public.store_products for select to anon, authenticated using ((active and stock > 0) or public.is_store_admin());
drop policy if exists "Admins manage products" on public.store_products;
create policy "Admins manage products" on public.store_products for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

drop policy if exists "Public reads payment settings" on public.store_settings;
create policy "Public reads payment settings" on public.store_settings for select to anon, authenticated using (true);
drop policy if exists "Admins manage payment settings" on public.store_settings;
create policy "Admins manage payment settings" on public.store_settings for update to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

drop policy if exists "Customers create orders" on public.store_orders;
create policy "Customers create orders" on public.store_orders for insert to anon, authenticated with check (status = 'pending_payment' and payment_method = 'bank_transfer' and payment_proof_path is null);
drop policy if exists "Customers submit payment proof" on public.store_orders;
create policy "Customers submit payment proof" on public.store_orders for update to anon, authenticated using (status = 'pending_payment') with check (status = 'payment_submitted' and payment_proof_path is not null);
drop policy if exists "Admins read orders" on public.store_orders;
create policy "Admins read orders" on public.store_orders for select to authenticated using (public.is_store_admin());
drop policy if exists "Admins update orders" on public.store_orders;
create policy "Admins update orders" on public.store_orders for update to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

drop policy if exists "Customers create order items" on public.store_order_items;
create policy "Customers create order items" on public.store_order_items for insert to anon, authenticated with check (true);
drop policy if exists "Admins read order items" on public.store_order_items;
create policy "Admins read order items" on public.store_order_items for select to authenticated using (public.is_store_admin());

revoke all on public.admin_users from anon;
grant select on public.admin_users to authenticated;
grant select on public.store_categories, public.store_products, public.store_settings to anon, authenticated;
grant insert on public.store_orders, public.store_order_items to anon, authenticated;
grant update (status, payment_proof_path) on public.store_orders to anon;
grant select, insert, update, delete on public.store_categories, public.store_products to authenticated;
grant select, update on public.store_orders to authenticated;
grant select on public.store_order_items to authenticated;
grant update on public.store_settings to authenticated;

insert into public.store_settings (id, transfers_enabled) values (1, false)
on conflict (id) do nothing;

insert into public.store_categories (slug, name, description, sort_order) values
  ('vestidos', 'Vestidos', 'Vestidos listos para solicitar según las referencias publicadas.', 10),
  ('moda-casual', 'Moda casual', 'Prendas versátiles para el día a día.', 20),
  ('camisetas-estampadas', 'Camisetas estampadas', 'Camisetas con diseños gráficos y acabados personalizados.', 30),
  ('busos-bordados', 'Busos bordados', 'Busos con bordados y detalles textiles.', 40),
  ('otras-prendas', 'Otras prendas', 'Nuevas propuestas y referencias de AZ MODA.', 50)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 8388608, array['image/jpeg','image/png','image/webp']),
  ('payment-proofs', 'payment-proofs', false, 8388608, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_store_admin());
drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_store_admin()) with check (bucket_id = 'product-images' and public.is_store_admin());
drop policy if exists "Admins delete product images" on storage.objects;
create policy "Admins delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_store_admin());
drop policy if exists "Customers upload payment proofs" on storage.objects;
create policy "Customers upload payment proofs" on storage.objects for insert to anon, authenticated with check (bucket_id = 'payment-proofs');
drop policy if exists "Admins read payment proofs" on storage.objects;
create policy "Admins read payment proofs" on storage.objects for select to authenticated using (bucket_id = 'payment-proofs' and public.is_store_admin());
