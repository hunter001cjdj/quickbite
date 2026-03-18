create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  price numeric(10, 2) not null check (price >= 0),
  description text,
  available boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_name text not null,
  phone text not null,
  address text not null,
  note text,
  status text not null default 'new' check (status in ('new', 'preparing', 'delivering', 'completed')),
  total numeric(10, 2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  item_name text not null,
  price numeric(10, 2) not null check (price >= 0),
  quantity integer not null check (quantity > 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists menu_items_set_updated_at on public.menu_items;
create trigger menu_items_set_updated_at
before update on public.menu_items
for each row
execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.current_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "public menu read" on public.menu_items;
create policy "public menu read"
on public.menu_items
for select
to anon, authenticated
using (true);

drop policy if exists "admin manage menu" on public.menu_items;
create policy "admin manage menu"
on public.menu_items
for all
to authenticated
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "staff read orders" on public.orders;
create policy "staff read orders"
on public.orders
for select
to authenticated
using (public.current_role() in ('staff', 'admin'));

drop policy if exists "staff update orders" on public.orders;
create policy "staff update orders"
on public.orders
for update
to authenticated
using (public.current_role() in ('staff', 'admin'))
with check (public.current_role() in ('staff', 'admin'));

drop policy if exists "staff read order items" on public.order_items;
create policy "staff read order items"
on public.order_items
for select
to authenticated
using (public.current_role() in ('staff', 'admin'));

do $$
begin
  begin
    alter publication supabase_realtime add table public.menu_items;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.orders;
  exception
    when duplicate_object then null;
  end;
end;
$$;

insert into public.menu_items (name, category, price, description, available, sort_order)
values
  ('香烤雞腿便當', '便當', 130, '附三樣配菜與白飯，招牌主餐。', true, 1),
  ('滷排骨便當', '便當', 120, '經典滷香口味，適合午餐主食。', true, 2),
  ('珍珠奶茶', '飲料', 55, '中杯，固定甜度冰量，可於備註註明調整。', true, 3),
  ('黃金脆薯', '小點', 60, '現炸小點心，適合加購。', true, 4)
on conflict do nothing;
