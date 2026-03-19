create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
add column if not exists customer_id uuid references public.customers (id) on delete set null;

create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customers (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    new.email
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_customer on auth.users;
create trigger on_auth_user_created_customer
after insert on auth.users
for each row execute function public.handle_new_customer();

insert into public.customers (id, full_name, phone, email)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  coalesce(u.raw_user_meta_data ->> 'phone', ''),
  u.email
from auth.users u
on conflict (id) do update
set
  full_name = excluded.full_name,
  phone = excluded.phone,
  email = excluded.email,
  updated_at = now();

update public.orders
set customer_id = c.id
from public.customers c
where public.orders.customer_id is null
  and public.orders.phone = c.phone;

alter table public.customers enable row level security;

drop policy if exists "customers self read" on public.customers;
create policy "customers self read"
on public.customers
for select
to authenticated
using (id = auth.uid());

drop policy if exists "customers self update" on public.customers;
create policy "customers self update"
on public.customers
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "customer read own orders" on public.orders;
create policy "customer read own orders"
on public.orders
for select
to authenticated
using (customer_id = auth.uid());

drop policy if exists "customer read own order items" on public.order_items;
create policy "customer read own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where public.orders.id = public.order_items.order_id
      and public.orders.customer_id = auth.uid()
  )
);
