-- Structur restaurant storefront setup for Supabase.
-- Run once in Supabase SQL Editor. Existing businesses, locations, customers,
-- bookings and inventory_items tables are reused and are not replaced.

-- Safe to rerun; schema and policy changes commit together.
begin;
create extension if not exists pgcrypto;

-- Bootstrap the core tables for a new Supabase project as well as existing exports.
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, slug text not null unique, about text,
  vertical text not null default 'restaurant', country text, city text,
  currency text not null default 'USD', timezone text not null default 'UTC',
  phone text, email text, logo_url text, status text not null default 'trial',
  storefront_published boolean not null default false,
  opening_hours jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null, address text, city text, phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  first_name text, last_name text, full_name text not null, phone text, email text,
  notes text, tags text[] not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  booking_type text not null default 'table_reservation', party_size integer not null default 2,
  table_label text, start_at timestamptz not null, end_at timestamptz,
  status text not null default 'pending', notes text, staff_user_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null, sku text, barcode text, unit text not null default 'unit',
  quantity_on_hand numeric not null default 0, low_stock_threshold numeric not null default 0,
  cost numeric(12,2), supplier_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Concurrent onboarding requests cannot create two businesses for one owner.
create unique index if not exists businesses_one_per_owner on public.businesses(owner_user_id);


-- Supabase Auth owns dashboard users. Restore the owner foreign key when no
-- legacy local-only owner IDs would prevent it. RLS below remains authoritative.
do $$
begin
  if not exists (
    select 1 from public.businesses b
    where b.owner_user_id is not null
      and not exists (select 1 from auth.users u where u.id = b.owner_user_id)
  ) and not exists (
    select 1 from pg_constraint where conname = 'businesses_owner_user_id_fkey'
  ) then
    alter table public.businesses add constraint businesses_owner_user_id_fkey
      foreign key (owner_user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- Columns used by the original owner dashboard UI.
alter table public.businesses add column if not exists language_default text not null default 'en';
alter table public.businesses add column if not exists onboarding_status text not null default 'completed';
alter table public.businesses add column if not exists active_modules_json text;
alter table public.businesses add column if not exists billing_mode text;
alter table public.businesses add column if not exists white_label_mode boolean not null default false;
alter table public.businesses add column if not exists custom_domain text;
alter table public.businesses add column if not exists cover_image_url text;

alter table public.locations add column if not exists country text;
alter table public.locations add column if not exists email text;
alter table public.locations add column if not exists opening_hours jsonb not null default '{}'::jsonb;

alter table public.customers add column if not exists loyalty_points integer not null default 0;
alter table public.customers add column if not exists total_spent numeric(12,2) not null default 0;

alter table public.inventory_items add column if not exists product_service_id uuid;
alter table public.inventory_items add column if not exists location_id uuid references public.locations(id) on delete set null;
alter table public.inventory_items add column if not exists variant_key text;
alter table public.inventory_items add column if not exists supplier_name text;
alter table public.inventory_items add column if not exists supplier_contact text;
alter table public.inventory_items add column if not exists last_restocked_at timestamptz;

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'USD',
  image_url text,
  dietary_tags text[] not null default '{}',
  variants jsonb not null default '[]'::jsonb,
  modifiers jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_items add column if not exists type text not null default 'menu_item';
alter table public.menu_items add column if not exists sku text;
alter table public.menu_items add column if not exists barcode text;
alter table public.menu_items add column if not exists duration_minutes integer;

create unique index if not exists menu_items_business_barcode_unique
  on public.menu_items(business_id, barcode)
  where barcode is not null and barcode <> '';

-- Local owner-dashboard support tables. Payments here are manual records only;
-- this script does not collect or process card details.
create table if not exists public.business_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payment_rules_json text not null default '{}',
  tax_rate numeric(7,4) not null default 0,
  service_charge_rate numeric(7,4) not null default 0,
  order_prefix text not null default 'ORD',
  receipt_footer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid,
  customer_id uuid references public.customers(id) on delete set null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'USD',
  status text not null default 'paid' check (status in ('pending','paid','failed','refunded')),
  method text not null default 'cash',
  provider_reference text,
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  channel text not null default 'email',
  campaign_type text,
  status text not null default 'draft',
  sent_count integer not null default 0,
  content text,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  points_delta integer not null,
  reason text,
  source_type text not null default 'manual',
  source_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_email text not null,
  role text not null default 'staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, user_email)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  order_number text not null unique,
  channel text not null default 'web',
  order_type text not null default 'pickup' check (order_type in ('pickup', 'delivery')),
  delivery_address text,
  status text not null default 'pending',
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  currency text not null default 'USD',
  payment_status text not null default 'unpaid',
  payment_gateway text,
  customer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  name_snapshot text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  selected_variant jsonb,
  selected_modifiers jsonb not null default '[]'::jsonb,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_order_id_fkey') then
    alter table public.payments add constraint payments_order_id_fkey
      foreign key (order_id) references public.orders(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'inventory_items_product_service_id_fkey') then
    alter table public.inventory_items add constraint inventory_items_product_service_id_fkey
      foreign key (product_service_id) references public.menu_items(id) on delete set null;
  end if;
end $$;

-- Keep customer lifetime spend accurate when order totals or statuses change.
create or replace function public.refresh_customer_total_spent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
begin
  if tg_op = 'DELETE' then v_customer_id := old.customer_id;
  elsif tg_op = 'INSERT' then v_customer_id := new.customer_id;
  else v_customer_id := coalesce(new.customer_id, old.customer_id);
  end if;
  if tg_op = 'UPDATE' and old.customer_id is distinct from new.customer_id then
    update public.customers set total_spent = coalesce((
      select sum(total) from public.orders where customer_id = old.customer_id and status = 'completed'
    ), 0) where id = old.customer_id;
  end if;
  if v_customer_id is not null then
    update public.customers
    set total_spent = coalesce((
      select sum(total) from public.orders
      where customer_id = v_customer_id and status = 'completed'
    ), 0)
    where id = v_customer_id;
  end if;
  return null;
end;
$$;

drop trigger if exists orders_refresh_customer_total on public.orders;
create trigger orders_refresh_customer_total
after insert or update of status, total, customer_id or delete on public.orders
for each row execute function public.refresh_customer_total_spent();

create index if not exists menu_categories_business_idx on public.menu_categories(business_id, sort_order);
create index if not exists menu_items_business_idx on public.menu_items(business_id, category_id, sort_order);
create index if not exists orders_business_idx on public.orders(business_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);

alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.businesses enable row level security;
alter table public.locations enable row level security;

alter table public.customers enable row level security;
alter table public.bookings enable row level security;
alter table public.inventory_items enable row level security;
alter table public.business_settings enable row level security;
alter table public.payments enable row level security;
alter table public.campaigns enable row level security;
alter table public.loyalty_ledger enable row level security;
alter table public.staff_memberships enable row level security;

grant usage on schema public to anon, authenticated;
revoke all on
  public.businesses, public.locations, public.customers, public.bookings,
  public.inventory_items, public.menu_categories, public.menu_items,
  public.orders, public.order_items, public.business_settings, public.payments,
  public.campaigns, public.loyalty_ledger, public.staff_memberships
from anon;
grant select on public.businesses, public.locations, public.menu_categories, public.menu_items to anon;
grant select, insert, update, delete on
  public.businesses, public.locations, public.customers, public.bookings,
  public.inventory_items, public.menu_categories, public.menu_items,
  public.orders, public.order_items, public.business_settings, public.payments,
  public.campaigns, public.loyalty_ledger, public.staff_memberships
to authenticated;

-- PostgreSQL combines permissive policies with OR. Remove every existing policy
-- on these restaurant tables; otherwise an old demo policy can bypass owner RLS.
do $$
declare rule record;
begin
  for rule in select schemaname, tablename, policyname from pg_policies
  where schemaname = 'public' and tablename = any(array[
    'businesses','locations','customers','bookings','inventory_items',
    'menu_categories','menu_items','orders','order_items','business_settings',
    'payments','campaigns','loyalty_ledger','staff_memberships'
  ]) loop
    execute format('drop policy %I on %I.%I', rule.policyname, rule.schemaname, rule.tablename);
  end loop;
end $$;
drop policy if exists "Local dashboard businesses" on public.businesses;
drop policy if exists "Local dashboard locations" on public.locations;
drop policy if exists "Local dashboard customers" on public.customers;
drop policy if exists "Local dashboard bookings" on public.bookings;
drop policy if exists "Local dashboard inventory" on public.inventory_items;
drop policy if exists "Local dashboard menu categories" on public.menu_categories;
drop policy if exists "Local dashboard menu items" on public.menu_items;
drop policy if exists "Local dashboard orders" on public.orders;
drop policy if exists "Local dashboard order items" on public.order_items;
drop policy if exists "Local dashboard settings" on public.business_settings;
drop policy if exists "Local dashboard payments" on public.payments;
drop policy if exists "Local dashboard campaigns" on public.campaigns;
drop policy if exists "Local dashboard loyalty" on public.loyalty_ledger;
drop policy if exists "Local dashboard staff memberships" on public.staff_memberships;

create or replace function public.is_business_owner(biz_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses
    where id = biz_id and owner_user_id = auth.uid()
  );
$$;
revoke all on function public.is_business_owner(uuid) from public;
grant execute on function public.is_business_owner(uuid) to authenticated;

drop policy if exists "Owners manage their businesses" on public.businesses;
create policy "Owners manage their businesses" on public.businesses for all to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
drop policy if exists "Owners manage locations" on public.locations;
create policy "Owners manage locations" on public.locations for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage customers" on public.customers;
create policy "Owners manage customers" on public.customers for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage bookings" on public.bookings;
create policy "Owners manage bookings" on public.bookings for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage inventory" on public.inventory_items;
create policy "Owners manage inventory" on public.inventory_items for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage menu categories" on public.menu_categories;
create policy "Owners manage menu categories" on public.menu_categories for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage menu items" on public.menu_items;
create policy "Owners manage menu items" on public.menu_items for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage orders" on public.orders;
create policy "Owners manage orders" on public.orders for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage order items" on public.order_items;
create policy "Owners manage order items" on public.order_items for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage settings" on public.business_settings;
create policy "Owners manage settings" on public.business_settings for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage payments" on public.payments;
create policy "Owners manage payments" on public.payments for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage campaigns" on public.campaigns;
create policy "Owners manage campaigns" on public.campaigns for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage loyalty" on public.loyalty_ledger;
create policy "Owners manage loyalty" on public.loyalty_ledger for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage staff memberships" on public.staff_memberships;
create policy "Owners manage staff memberships" on public.staff_memberships for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Staff read their membership" on public.staff_memberships;
create policy "Staff read their membership" on public.staff_memberships for select to authenticated using (lower(user_email) = lower(coalesce(auth.jwt()->>'email', '')));

drop policy if exists "Public can read published menu categories" on public.menu_categories;
create policy "Public can read published menu categories" on public.menu_categories
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.businesses b
    where b.id = business_id and b.vertical = 'restaurant' and b.storefront_published = true
  )
);

drop policy if exists "Public can read published menu items" on public.menu_items;
create policy "Public can read published menu items" on public.menu_items
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.businesses b
    where b.id = business_id and b.vertical = 'restaurant' and b.storefront_published = true
  )
);

-- These policies allow the storefront to discover only published restaurants
-- and their active locations. Legacy broader policies have been removed.
drop policy if exists "Public can read published restaurants" on public.businesses;
create policy "Public can read published restaurants" on public.businesses
for select to anon, authenticated using (vertical = 'restaurant' and storefront_published = true);

drop policy if exists "Public can read active restaurant locations" on public.locations;
create policy "Public can read active restaurant locations" on public.locations
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.businesses b
    where b.id = business_id and b.vertical = 'restaurant' and b.storefront_published = true
  )
);

create or replace function public.place_restaurant_order(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_business public.businesses%rowtype;
  v_customer_id uuid; v_order_id uuid; v_order_number text;
  v_item jsonb; v_menu public.menu_items%rowtype; v_quantity integer;
  v_subtotal numeric(12,2) := 0;
begin
  select * into v_business from public.businesses
  where id = (p_payload->>'business_id')::uuid and vertical = 'restaurant' and storefront_published;
  if not found then raise exception 'Restaurant is unavailable'; end if;
  if coalesce(trim(p_payload->'customer'->>'full_name'), '') = '' or coalesce(trim(p_payload->'customer'->>'phone'), '') = '' then
    raise exception 'Name and phone are required';
  end if;
  if jsonb_typeof(p_payload->'items') is distinct from 'array' then raise exception 'Order items must be an array'; end if;
  if jsonb_array_length(p_payload->'items') not between 1 and 100 then raise exception 'Order must contain 1 to 100 items'; end if;
  if coalesce(nullif(p_payload->>'order_type', ''), 'pickup') not in ('pickup', 'delivery') then raise exception 'Invalid order type'; end if;
  if p_payload->>'order_type' = 'delivery' and coalesce(trim(p_payload->>'delivery_address'), '') = '' then raise exception 'Delivery address is required'; end if;
  if nullif(p_payload->>'location_id', '') is not null and not exists (
    select 1 from public.locations where id = (p_payload->>'location_id')::uuid and business_id = v_business.id and is_active
  ) then raise exception 'Branch is unavailable'; end if;

  -- Lock menu rows for this transaction so price/availability cannot change
  -- between calculating the order total and inserting its line items.
  for v_item in select value from jsonb_array_elements(p_payload->'items') loop
    if coalesce(v_item->>'quantity', '') !~ '^[0-9]{1,2}$' then raise exception 'Quantity must be an integer between 1 and 99'; end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity not between 1 and 99 then raise exception 'Quantity must be between 1 and 99'; end if;
    select * into v_menu from public.menu_items
    where id = (v_item->>'menu_item_id')::uuid and business_id = v_business.id and is_active for share;
    if not found then raise exception 'A menu item is unavailable'; end if;
    v_subtotal := v_subtotal + v_menu.price * v_quantity;
  end loop;

  select id into v_customer_id from public.customers
  where business_id = v_business.id and phone = trim(p_payload->'customer'->>'phone')
  order by created_at desc limit 1;
  if v_customer_id is null then
    insert into public.customers (business_id, full_name, phone, email)
    values (v_business.id, trim(p_payload->'customer'->>'full_name'), trim(p_payload->'customer'->>'phone'), nullif(trim(p_payload->'customer'->>'email'), ''))
    returning id into v_customer_id;
  end if;
  v_order_number := 'ORD-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.orders (
    business_id, location_id, customer_id, order_number, channel, order_type,
    delivery_address, status, subtotal, total, currency, payment_status, customer_notes
  ) values (
    v_business.id, nullif(p_payload->>'location_id', '')::uuid, v_customer_id, v_order_number, 'web',
    coalesce(nullif(p_payload->>'order_type', ''), 'pickup'), nullif(p_payload->>'delivery_address', ''),
    'pending', v_subtotal, v_subtotal, v_business.currency, 'unpaid', nullif(p_payload->>'notes', '')
  ) returning id into v_order_id;
  for v_item in select value from jsonb_array_elements(p_payload->'items') loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_menu from public.menu_items where id = (v_item->>'menu_item_id')::uuid and business_id = v_business.id;
    insert into public.order_items (business_id, order_id, menu_item_id, name_snapshot, quantity, unit_price, line_total)
    values (v_business.id, v_order_id, v_menu.id, v_menu.name, v_quantity, v_menu.price, v_menu.price * v_quantity);
  end loop;
  return jsonb_build_object('id', v_order_id, 'order_number', v_order_number, 'total', v_subtotal, 'currency', v_business.currency);
end $$;

create or replace function public.request_restaurant_booking(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_business_id uuid := (p_payload->>'business_id')::uuid;
  v_customer_id uuid; v_booking_id uuid;
begin
  if not exists (select 1 from public.businesses where id = v_business_id and vertical = 'restaurant' and storefront_published) then
    raise exception 'Restaurant is unavailable';
  end if;
  if coalesce(trim(p_payload->'customer'->>'full_name'), '') = '' or coalesce(trim(p_payload->'customer'->>'phone'), '') = '' then
    raise exception 'Name and phone are required';
  end if;
  if nullif(p_payload->>'location_id', '') is not null and not exists (
    select 1 from public.locations where id = (p_payload->>'location_id')::uuid and business_id = v_business_id and is_active
  ) then raise exception 'Branch is unavailable'; end if;
  if (p_payload->>'start_at') is null or not isfinite((p_payload->>'start_at')::timestamptz) or (p_payload->>'start_at')::timestamptz <= now() then
    raise exception 'Reservation time must be in the future';
  end if;
  if coalesce(p_payload->>'party_size', '') !~ '^[0-9]{1,2}$' then raise exception 'Party size must be an integer between 1 and 30'; end if;
  if (p_payload->>'party_size')::integer not between 1 and 30 then raise exception 'Party size must be between 1 and 30'; end if;
  select id into v_customer_id from public.customers
  where business_id = v_business_id and phone = trim(p_payload->'customer'->>'phone') order by created_at desc limit 1;
  if v_customer_id is null then
    insert into public.customers (business_id, full_name, phone, email)
    values (v_business_id, trim(p_payload->'customer'->>'full_name'), trim(p_payload->'customer'->>'phone'), nullif(trim(p_payload->'customer'->>'email'), ''))
    returning id into v_customer_id;
  end if;
  insert into public.bookings (business_id, customer_id, location_id, booking_type, party_size, start_at, status, notes)
  values (v_business_id, v_customer_id, nullif(p_payload->>'location_id', '')::uuid, 'table_reservation',
    (p_payload->>'party_size')::integer, (p_payload->>'start_at')::timestamptz, 'pending', nullif(p_payload->>'notes', ''))
  returning id into v_booking_id;
  return jsonb_build_object('id', v_booking_id, 'status', 'pending');
end $$;
revoke all on function public.place_restaurant_order(jsonb), public.request_restaurant_booking(jsonb) from public;
grant execute on function public.place_restaurant_order(jsonb), public.request_restaurant_booking(jsonb) to anon, authenticated;

-- RLS scopes the row itself. These triggers also scope its foreign references.
create or replace function public.check_business_references()
returns trigger language plpgsql set search_path = public as $$
declare i integer; ref_id uuid; ref_business uuid;
begin
  for i in 0..(tg_nargs / 2 - 1) loop
    ref_id := nullif(to_jsonb(new)->>tg_argv[i*2], '')::uuid;
    if ref_id is not null then
      execute format('select business_id from public.%I where id = $1', tg_argv[i*2+1]) into ref_business using ref_id;
      if ref_business is distinct from new.business_id then raise exception 'Referenced record does not belong to this business'; end if;
    end if;
  end loop;
  return new;
end $$;
do $$
declare spec record;
begin
  for spec in select * from (values
    ('menu_items', '''category_id'', ''menu_categories'''),
    ('bookings', '''customer_id'', ''customers'', ''location_id'', ''locations'''),
    ('orders', '''customer_id'', ''customers'', ''location_id'', ''locations'''),
    ('order_items', '''order_id'', ''orders'', ''menu_item_id'', ''menu_items'''),
    ('inventory_items', '''product_service_id'', ''menu_items'', ''location_id'', ''locations'''),
    ('payments', '''customer_id'', ''customers'', ''order_id'', ''orders'''),
    ('loyalty_ledger', '''customer_id'', ''customers''')
  ) as refs(tbl, args) loop
    execute format('drop trigger if exists validate_business_references on public.%I', spec.tbl);
    execute format('create trigger validate_business_references before insert or update on public.%I for each row execute function public.check_business_references(%s)', spec.tbl, spec.args);
  end loop;
end $$;
-- Loyalty balances and their ledger must commit in one transaction.
create or replace function public.apply_loyalty_delta()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op <> 'INSERT' then
    update public.customers set loyalty_points = loyalty_points - old.points_delta where id = old.customer_id;
  end if;
  if tg_op <> 'DELETE' then
    update public.customers set loyalty_points = loyalty_points + new.points_delta where id = new.customer_id;
  end if;
  return null;
end $$;
drop trigger if exists loyalty_apply_delta on public.loyalty_ledger;
create trigger loyalty_apply_delta after insert or update or delete on public.loyalty_ledger for each row execute function public.apply_loyalty_delta();

-- Manual partial payments do not mark the whole order paid.
create or replace function public.sync_order_payment()
returns trigger language plpgsql set search_path = public as $$
declare target uuid; paid numeric; refunded numeric; order_total numeric;
begin
  for target in select distinct id from (
    select case when tg_op <> 'INSERT' then old.order_id end as id
    union select case when tg_op <> 'DELETE' then new.order_id end
  ) ids where id is not null loop
    select total into order_total from public.orders where id = target for update;
    select coalesce(sum(amount) filter (where status = 'paid'), 0),
           coalesce(sum(amount) filter (where status = 'refunded'), 0)
    into paid, refunded from public.payments where order_id = target;
    update public.orders set payment_status = case
      when paid >= order_total then 'paid'
      when paid > 0 then 'partial'
      when refunded > 0 then 'refunded'
      else 'unpaid' end where id = target;
  end loop;
  return null;
end $$;
drop trigger if exists payments_sync_order on public.payments;
create trigger payments_sync_order after insert or update or delete on public.payments for each row execute function public.sync_order_payment();

create or replace function public.set_order_payment_status(p_order_id uuid, p_status text)
returns jsonb language plpgsql set search_path = public as $$
declare target public.orders%rowtype; paid numeric;
begin
  select * into target from public.orders where id = p_order_id and public.is_business_owner(business_id) for update;
  if not found then raise exception 'Order is unavailable'; end if;
  if p_status not in ('paid', 'unpaid', 'refunded') or p_status is null then raise exception 'Invalid payment status'; end if;
  if p_status = 'paid' then
    select coalesce(sum(amount), 0) into paid from public.payments where order_id = target.id and status = 'paid';
    if paid < target.total then
      insert into public.payments (business_id, order_id, customer_id, amount, currency, status, method, paid_at, notes)
      values (target.business_id, target.id, target.customer_id, target.total - paid, target.currency, 'paid', 'manual', now(), 'Recorded from order details');
    end if;
  elsif p_status = 'refunded' then
    update public.payments set status = 'refunded' where order_id = target.id and status = 'paid';
  else
    update public.payments set status = 'pending' where order_id = target.id and status in ('paid', 'refunded');
  end if;
  update public.orders set payment_status = p_status where id = target.id returning * into target;
  return to_jsonb(target);
end $$;
revoke all on function public.set_order_payment_status(uuid, text) from public;
grant execute on function public.set_order_payment_status(uuid, text) to authenticated;

commit;
