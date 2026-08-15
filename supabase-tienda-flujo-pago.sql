-- Expone datos bancarios solo cuando las transferencias están habilitadas
-- y protege la secuencia de estados de cada pedido.
drop policy if exists "Public reads payment settings" on public.store_settings;
drop policy if exists "Admins read payment settings" on public.store_settings;
create policy "Admins read payment settings"
on public.store_settings for select to authenticated
using (public.is_store_admin());

revoke select on public.store_settings from anon;
grant select, update on public.store_settings to authenticated;

create or replace function public.get_store_payment_settings()
returns table (
  transfers_enabled boolean,
  bank_name text,
  account_type text,
  account_number text,
  account_holder text,
  holder_document text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    s.transfers_enabled,
    case when s.transfers_enabled then s.bank_name end,
    case when s.transfers_enabled then s.account_type end,
    case when s.transfers_enabled then s.account_number end,
    case when s.transfers_enabled then s.account_holder end,
    case when s.transfers_enabled then s.holder_document end
  from public.store_settings s
  where s.id = 1;
$$;

revoke all on function public.get_store_payment_settings() from public;
grant execute on function public.get_store_payment_settings() to anon, authenticated;

create or replace function public.enforce_store_order_status_flow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'in_preparation' and old.status <> 'payment_confirmed' then
    raise exception 'El pedido debe tener el pago confirmado antes de pasar a preparación.';
  end if;

  if new.status = 'completed' and old.status <> 'in_preparation' then
    raise exception 'El pedido debe estar en preparación antes de completarse.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_store_order_status_flow on public.store_orders;
create trigger enforce_store_order_status_flow
before update of status on public.store_orders
for each row execute function public.enforce_store_order_status_flow();
