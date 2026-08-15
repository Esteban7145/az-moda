-- El servidor calcula los totales; el navegador nunca decide el valor final.
create or replace function public.create_store_order(
  p_order_id uuid,
  p_customer jsonb,
  p_items jsonb
)
returns table(order_id uuid, total_cop numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  calculated_total numeric(12,0);
  invalid_count integer;
begin
  if p_order_id is null or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'El pedido no contiene productos.';
  end if;

  if nullif(trim(p_customer->>'customer_name'), '') is null
    or nullif(trim(p_customer->>'customer_whatsapp'), '') is null
    or nullif(trim(p_customer->>'customer_email'), '') is null
    or nullif(trim(p_customer->>'city'), '') is null
    or nullif(trim(p_customer->>'address'), '') is null then
    raise exception 'Faltan datos del cliente.';
  end if;

  select count(*) into invalid_count
  from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer, size text, color text)
  left join public.store_products product on product.id = requested.product_id
  where product.id is null
     or not product.active
     or requested.quantity is null
     or requested.quantity < 1
     or requested.quantity > product.stock;

  if invalid_count > 0 then
    raise exception 'Uno o más productos no están disponibles en la cantidad solicitada.';
  end if;

  select sum(product.price_cop * requested.quantity)::numeric(12,0)
  into calculated_total
  from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer, size text, color text)
  join public.store_products product on product.id = requested.product_id;

  insert into public.store_orders (
    id, customer_name, customer_whatsapp, customer_email, city, address, notes,
    subtotal_cop, total_cop, status, payment_method
  ) values (
    p_order_id,
    left(trim(p_customer->>'customer_name'), 90),
    left(trim(p_customer->>'customer_whatsapp'), 20),
    left(trim(p_customer->>'customer_email'), 120),
    left(trim(p_customer->>'city'), 80),
    left(trim(p_customer->>'address'), 260),
    nullif(left(trim(coalesce(p_customer->>'notes', '')), 400), ''),
    calculated_total, calculated_total, 'pending_payment', 'bank_transfer'
  );

  insert into public.store_order_items (
    order_id, product_id, product_name, unit_price_cop, quantity, size, color
  )
  select
    p_order_id, product.id, product.name, product.price_cop, requested.quantity,
    nullif(left(trim(coalesce(requested.size, '')), 60), ''),
    nullif(left(trim(coalesce(requested.color, '')), 60), '')
  from jsonb_to_recordset(p_items) as requested(product_id uuid, quantity integer, size text, color text)
  join public.store_products product on product.id = requested.product_id;

  return query select p_order_id, calculated_total;
end;
$$;

revoke all on function public.create_store_order(uuid, jsonb, jsonb) from public;
grant execute on function public.create_store_order(uuid, jsonb, jsonb) to anon, authenticated;
revoke insert on public.store_orders, public.store_order_items from anon, authenticated;

-- Al confirmar el pago se reserva el inventario de forma atómica.
create or replace function public.reserve_paid_order_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  unavailable integer;
begin
  if old.status <> 'payment_confirmed' and new.status = 'payment_confirmed' then
    select count(*) into unavailable
    from public.store_order_items item
    join public.store_products product on product.id = item.product_id
    where item.order_id = new.id and product.stock < item.quantity;

    if unavailable > 0 then
      raise exception 'No hay inventario suficiente para confirmar este pedido.';
    end if;

    update public.store_products product
    set stock = product.stock - item.quantity
    from public.store_order_items item
    where item.order_id = new.id and item.product_id = product.id;
  end if;
  return new;
end;
$$;

drop trigger if exists reserve_stock_on_payment_confirmation on public.store_orders;
create trigger reserve_stock_on_payment_confirmation
before update of status on public.store_orders
for each row execute function public.reserve_paid_order_stock();
