-- Restaurant migration aligned with project cdkvojsruitrbgwkvgjt.
-- Rerunnable and transactional. Existing business data is preserved.
begin;
create extension if not exists pgcrypto;
-- Column shapes verified against the supplied diagram and live read-only probes.
-- Existing hosted constraints/triggers must still be checked during deployment.
create table if not exists public.businesses (
 id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, about text,
 vertical text not null default 'restaurant', country text, city text, currency text not null default 'USD',
 timezone text not null default 'UTC', phone text, email text, logo_url text, opening_hours jsonb default '{}',
 owner_user_id uuid references auth.users(id), status text not null default 'trial', storefront_published boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 language_default text default 'en', onboarding_status text default 'completed', active_modules_json text,
 billing_mode text, white_label_mode boolean default false, custom_domain text, cover_image_url text
);
create table if not exists public.locations (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 name text not null, address text, city text, phone text, is_active boolean not null default true,
 created_at timestamptz not null default now(), country text, email text, opening_hours jsonb default '{}'
);
create table if not exists public.customers (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 first_name text, last_name text, full_name text, phone text, email text, notes text, tags text[] default '{}',
 created_at timestamptz not null default now(), loyalty_points integer not null default 0, total_spent numeric not null default 0
);
create table if not exists public.categories (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 name text not null, sort_order integer not null default 0, is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.product_services (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 category_id uuid references public.categories(id) on delete set null, name text not null, description text,
 price numeric not null default 0 check (price >= 0), currency text not null default 'USD', image_url text,
 is_active boolean not null default true, recipe jsonb, duration_minutes integer, duration_buffer_minutes integer,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.bookings (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 customer_id uuid references public.customers(id) on delete set null, location_id uuid references public.locations(id) on delete set null,
 booking_type text not null default 'table_reservation', party_size integer not null default 2, table_label text,
 start_at timestamptz not null, end_at timestamptz, status text not null default 'pending', notes text, staff_user_id uuid,
 created_at timestamptz not null default now()
);
create table if not exists public.inventory_items (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 name text not null, sku text, unit text, quantity_on_hand numeric not null default 0, low_stock_threshold numeric not null default 0,
 cost numeric, supplier_id uuid, created_at timestamptz not null default now(),
 barcode text, product_service_id uuid references public.product_services(id) on delete set null,
 location_id uuid references public.locations(id) on delete set null, variant_key text, supplier_name text,
 supplier_contact text, last_restocked_at timestamptz
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 customer_id uuid references public.customers(id) on delete set null, location_id uuid references public.locations(id) on delete set null,
 order_type text not null default 'dine_in', status text not null default 'pending', subtotal numeric not null default 0,
 tax numeric not null default 0, service_charge numeric not null default 0, total numeric not null default 0,
 payment_status text not null default 'unpaid', inventory_deducted boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), table_label text, notes text
);
create table if not exists public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 product_service_id uuid references public.product_services(id) on delete set null, name_snapshot text not null,
 quantity integer not null default 1 check (quantity > 0), unit_price numeric not null default 0,
 modifiers jsonb default '[]', notes text, created_at timestamptz not null default now()
);
create table if not exists public.business_settings (
 id uuid primary key default gen_random_uuid(), business_id uuid not null unique references public.businesses(id) on delete cascade,
 reservation_rules jsonb, loyalty_rules jsonb, notification_rules jsonb, payment_rules jsonb, tax_settings jsonb,
 floor_plan jsonb default '[]', service_charge_percent numeric default 0, tax_rate_percent numeric default 0,
 tip_suggestions jsonb default '[]', delivery_zones jsonb default '[]', prep_time_by_category jsonb,
 receipt_footer_text text, cancellation_policy text, reviews jsonb, created_at timestamptz not null default now()
);
create table if not exists public.payments (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 order_id uuid references public.orders(id) on delete set null, customer_id uuid references public.customers(id) on delete set null,
 amount numeric not null default 0 check(amount >= 0), currency text not null default 'USD',
 status text not null default 'paid' check(status in ('paid','pending','failed','refunded')), method text not null default 'cash',
 provider_reference text, notes text, paid_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.campaigns (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 name text not null, channel text not null default 'email', campaign_type text, status text not null default 'draft',
 sent_count integer not null default 0, content text, scheduled_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.loyalty_ledger (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 customer_id uuid not null references public.customers(id) on delete cascade, points_delta integer not null,
 reason text, source_type text not null default 'manual', source_id uuid, created_at timestamptz not null default now()
);
create table if not exists public.staff_memberships (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 user_id uuid references auth.users(id), user_email text not null, user_name text, role text not null default 'staff',
 created_at timestamptz not null default now()
);

-- Block financial/stock double-processing by an unknown legacy trigger. Its
-- definition must be reconciled before this migration installs its replacement.
do $$
declare legacy record;
begin
 for legacy in
  select c.relname, t.tgname from pg_trigger t
  join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
  join pg_proc p on p.oid=t.tgfoid
  where n.nspname='public' and not t.tgisinternal and (
   (c.relname='orders' and not (p.proname = 'process_restaurant_order_stock' and t.tgname = 'restaurant_process_order_stock') and pg_get_functiondef(p.oid) ~* '(quantity_on_hand|inventory_deducted)') or
   (c.relname='loyalty_ledger' and not (p.proname = 'apply_loyalty_delta' and t.tgname = 'loyalty_apply_delta') and pg_get_functiondef(p.oid) ~* 'loyalty_points') or
   (c.relname='payments' and not (p.proname = 'sync_order_payment' and t.tgname = 'payments_sync_order') and pg_get_functiondef(p.oid) ~* 'payment_status')
  )
 loop
  raise exception 'Reconcile legacy trigger %.% before installing restaurant processing',legacy.relname,legacy.tgname;
 end loop;
end $$;

-- Add only UI support fields missing from the verified canonical tables.
alter table public.categories add column if not exists description text;
alter table public.categories add column if not exists image_url text;
alter table public.product_services add column if not exists type text not null default 'menu_item';
alter table public.product_services add column if not exists sku text;
alter table public.product_services add column if not exists barcode text;
alter table public.product_services add column if not exists dietary_tags text[] not null default '{}';
alter table public.product_services add column if not exists variants jsonb not null default '[]';
alter table public.product_services add column if not exists modifiers jsonb not null default '[]';
alter table public.product_services add column if not exists is_featured boolean not null default false;
alter table public.product_services add column if not exists sort_order integer not null default 0;
alter table public.orders add column if not exists delivery_address text;
create unique index if not exists product_services_business_barcode_unique on public.product_services(business_id, barcode) where barcode is not null and barcode <> '';
create index if not exists product_services_business_idx on public.product_services(business_id, category_id);
create index if not exists categories_business_idx on public.categories(business_id, sort_order);
create unique index if not exists business_settings_one_business on public.business_settings(business_id);
create index if not exists orders_business_idx on public.orders(business_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- Publish only the two checkout rates, never payment provider configuration.
create or replace function public.get_restaurant_checkout_settings(p_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not exists (select 1 from public.businesses where id = p_business_id and vertical = 'restaurant' and storefront_published) then raise exception 'Restaurant is unavailable'; end if;
  select jsonb_build_object('tax_rate_percent', coalesce(tax_rate_percent, 0), 'service_charge_percent', coalesce(service_charge_percent, 0)) into result
  from public.business_settings where business_id = p_business_id;
  if (result->>'tax_rate_percent')::numeric not between 0 and 100 or (result->>'service_charge_percent')::numeric not between 0 and 100 then raise exception 'Restaurant checkout rates require correction'; end if;
  return coalesce(result, '{"tax_rate_percent":0,"service_charge_percent":0}'::jsonb);
end $$;
revoke all on function public.get_restaurant_checkout_settings(uuid) from public;
grant execute on function public.get_restaurant_checkout_settings(uuid) to anon, authenticated;
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

create index if not exists categories_business_idx on public.categories(business_id, sort_order);
create index if not exists product_services_business_idx on public.product_services(business_id, category_id, sort_order);
create index if not exists orders_business_idx on public.orders(business_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);

alter table public.categories enable row level security;
alter table public.product_services enable row level security;
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
  public.inventory_items, public.categories, public.product_services,
  public.orders, public.order_items, public.business_settings, public.payments,
  public.campaigns, public.loyalty_ledger, public.staff_memberships
from anon;
grant select on public.businesses, public.locations, public.categories, public.product_services to anon;
grant select, insert, update, delete on
  public.businesses, public.locations, public.customers, public.bookings,
  public.inventory_items, public.categories, public.product_services,
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
    'categories','product_services','orders','order_items','business_settings',
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
drop policy if exists "Local dashboard menu categories" on public.categories;
drop policy if exists "Local dashboard menu items" on public.product_services;
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
drop policy if exists "Owners manage menu categories" on public.categories;
create policy "Owners manage menu categories" on public.categories for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage menu items" on public.product_services;
create policy "Owners manage menu items" on public.product_services for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage orders" on public.orders;
create policy "Owners manage orders" on public.orders for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
drop policy if exists "Owners manage order items" on public.order_items;
create policy "Owners manage order items" on public.order_items for all to authenticated
using (exists (select 1 from public.orders o where o.id = order_id and public.is_business_owner(o.business_id)))
with check (exists (select 1 from public.orders o where o.id = order_id and public.is_business_owner(o.business_id)));
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
create policy "Staff read their membership" on public.staff_memberships for select to authenticated using (user_id = auth.uid());

drop policy if exists "Public can read published menu categories" on public.categories;
create policy "Public can read published menu categories" on public.categories
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.businesses b
    where b.id = business_id and b.vertical = 'restaurant' and b.storefront_published = true
  )
);

drop policy if exists "Public can read published menu items" on public.product_services;
create policy "Public can read published menu items" on public.product_services
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
  v_customer_id uuid; v_order_id uuid; v_order_number text; v_service numeric; v_tax numeric; v_rates jsonb;
  v_item jsonb; v_menu public.product_services%rowtype; v_quantity integer;
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
    select * into v_menu from public.product_services
    where id = (v_item->>'product_service_id')::uuid and business_id = v_business.id and is_active
      and (category_id is null or exists (select 1 from public.categories c where c.id = category_id and c.business_id = v_business.id and c.is_active))
    for share;
    if not found then raise exception 'A menu item is unavailable'; end if;
    if v_menu.price is null or v_menu.price < 0 or v_menu.price::text in ('NaN','Infinity','-Infinity') then raise exception 'Menu item price requires correction'; end if;
    if v_menu.currency <> v_business.currency then raise exception 'Menu item currency does not match the restaurant currency'; end if;
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
  v_rates := public.get_restaurant_checkout_settings(v_business.id);
  v_service := round(v_subtotal * (v_rates->>'service_charge_percent')::numeric / 100, 2);
  v_tax := round((v_subtotal + v_service) * (v_rates->>'tax_rate_percent')::numeric / 100, 2);
  insert into public.orders (
    business_id, location_id, customer_id, order_type, delivery_address,
    status, subtotal, service_charge, tax, total, payment_status, notes
  ) values (
    v_business.id, nullif(p_payload->>'location_id', '')::uuid, v_customer_id,
    coalesce(nullif(p_payload->>'order_type', ''), 'pickup'), nullif(p_payload->>'delivery_address', ''),
    'pending', v_subtotal, v_service, v_tax, v_subtotal + v_service + v_tax, 'unpaid', nullif(p_payload->>'notes', '')
  ) returning id into v_order_id;
  v_order_number := 'ORD-' || upper(substr(v_order_id::text, 1, 8));
  for v_item in select value from jsonb_array_elements(p_payload->'items') loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_menu from public.product_services where id = (v_item->>'product_service_id')::uuid and business_id = v_business.id;
    insert into public.order_items (order_id, product_service_id, name_snapshot, quantity, unit_price, recipe_snapshot)
    values (v_order_id, v_menu.id, v_menu.name, v_quantity, v_menu.price, coalesce(v_menu.recipe,'[]'));
  end loop;
  return jsonb_build_object('id', v_order_id, 'order_number', v_order_number, 'subtotal', v_subtotal, 'service_charge', v_service, 'tax', v_tax, 'total', v_subtotal + v_service + v_tax, 'currency', v_business.currency);
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
declare i integer; ref_id uuid; ref_business uuid; row_business uuid;
begin
  if tg_table_name = 'order_items' then
    select business_id into row_business from public.orders where id = new.order_id;
  else row_business := (to_jsonb(new)->>'business_id')::uuid;
  end if;
  for i in 0..(tg_nargs / 2 - 1) loop
    ref_id := nullif(to_jsonb(new)->>tg_argv[i*2], '')::uuid;
    if ref_id is not null then
      execute format('select business_id from public.%I where id = $1', tg_argv[i*2+1]) into ref_business using ref_id;
      if ref_business is distinct from row_business then raise exception 'Referenced record does not belong to this business'; end if;
    end if;
  end loop;
  return new;
end $$;
do $$
declare spec record;
begin
  for spec in select * from (values
    ('product_services', '''category_id'', ''categories'''),
    ('bookings', '''customer_id'', ''customers'', ''location_id'', ''locations'''),
    ('orders', '''customer_id'', ''customers'', ''location_id'', ''locations'''),
    ('order_items', '''order_id'', ''orders'', ''product_service_id'', ''product_services'''),
    ('inventory_items', '''product_service_id'', ''product_services'', ''location_id'', ''locations'''),
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
      values (target.business_id, target.id, target.customer_id, target.total - paid, (select currency from public.businesses where id = target.business_id), 'paid', 'manual', now(), 'Recorded from order details');
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

-- Public projections exclude owner IDs, recipes, barcodes and payment configuration.
create or replace view public.restaurant_public_businesses with (security_barrier = true) as
select id, name, slug, about, vertical, country, city, currency, timezone, phone, email, logo_url,
 cover_image_url, opening_hours, language_default, storefront_published, created_at
from public.businesses where vertical = 'restaurant' and storefront_published;
create or replace view public.restaurant_public_categories with (security_barrier = true) as
select c.id, c.business_id, c.name, c.description, c.image_url, c.sort_order, c.is_active
from public.categories c join public.businesses b on b.id = c.business_id
where b.vertical = 'restaurant' and b.storefront_published and c.is_active;
create or replace view public.restaurant_public_products with (security_barrier = true) as
select p.id, p.business_id, p.category_id, p.name, p.description, p.price, p.currency, p.image_url,
 p.dietary_tags, p.variants, p.modifiers, p.is_featured, p.sort_order, p.is_active
from public.product_services p join public.businesses b on b.id = p.business_id
left join public.categories c on c.id = p.category_id and c.business_id = p.business_id
where b.vertical = 'restaurant' and b.storefront_published and p.is_active and p.currency = b.currency and (p.category_id is null or c.is_active);
create or replace view public.restaurant_public_locations with (security_barrier = true) as
select l.id, l.business_id, l.name, l.address, l.city, l.country, l.phone, l.email, l.opening_hours, l.is_active
from public.locations l join public.businesses b on b.id = l.business_id
where b.vertical = 'restaurant' and b.storefront_published and l.is_active;
grant select on public.restaurant_public_businesses, public.restaurant_public_categories, public.restaurant_public_products, public.restaurant_public_locations to anon, authenticated;
revoke all on public.businesses, public.categories, public.product_services, public.locations from anon;
drop policy if exists "Public can read published restaurants" on public.businesses;
drop policy if exists "Public can read active restaurant locations" on public.locations;
drop policy if exists "Public can read published menu categories" on public.categories;
drop policy if exists "Public can read published menu items" on public.product_services;

-- Preserve any records written by the previous, separate menu implementation.
-- JSON extraction tolerates optional columns on those legacy tables.
do $$
declare source_row record; j jsonb; tbl text;
begin
  if to_regclass('public.menu_categories') is not null then
    for source_row in execute 'select to_jsonb(m) as data from public.menu_categories m' loop
      j := source_row.data;
      insert into public.categories(id, business_id, name, sort_order, is_active, description, image_url)
      values ((j->>'id')::uuid, (j->>'business_id')::uuid, j->>'name', coalesce((j->>'sort_order')::integer,0), coalesce((j->>'is_active')::boolean,true), j->>'description', j->>'image_url')
      on conflict(id) do nothing;
    end loop;
  end if;
  if to_regclass('public.menu_items') is not null then
    for source_row in execute 'select to_jsonb(m) as data from public.menu_items m' loop
      j := source_row.data;
      insert into public.product_services(id,business_id,category_id,name,description,price,currency,image_url,is_active,barcode,variants,modifiers,is_featured,sort_order)
      values ((j->>'id')::uuid,(j->>'business_id')::uuid,nullif(j->>'category_id','')::uuid,j->>'name',j->>'description',(j->>'price')::numeric,coalesce(j->>'currency','USD'),j->>'image_url',coalesce((j->>'is_active')::boolean,true),j->>'barcode',coalesce(j->'variants','[]'),coalesce(j->'modifiers','[]'),coalesce((j->>'is_featured')::boolean,false),coalesce((j->>'sort_order')::integer,0))
      on conflict(id) do nothing;
    end loop;
  end if;
  -- Remove public access to the unused legacy catalog without deleting its rows.
  foreach tbl in array array['menu_categories','menu_items'] loop
    if to_regclass('public.' || tbl) is not null then
      execute format('revoke all on public.%I from anon, authenticated', tbl);
    end if;
  end loop;
  -- Suppliers and purchase orders are private restaurant operations as well.
  foreach tbl in array array['suppliers','purchase_orders'] loop
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table public.%I enable row level security', tbl);
      for source_row in select policyname from pg_policies where schemaname='public' and tablename=tbl loop
        execute format('drop policy %I on public.%I', source_row.policyname, tbl);
      end loop;
      execute format('revoke all on public.%I from anon', tbl);
      execute format('grant select, insert, update, delete on public.%I to authenticated', tbl);
      execute format('create policy "Owners manage purchasing" on public.%I for all to authenticated using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id))', tbl);
    end if;
  end loop;
end $$;

-- Snapshot recipes so completing/refunding an order uses its original ingredients.
alter table public.order_items add column if not exists recipe_snapshot jsonb;
create table if not exists public.restaurant_stock_movements (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 order_id uuid not null references public.orders(id) on delete cascade,
 inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
 quantity_delta numeric not null, created_at timestamptz not null default now()
);
alter table public.restaurant_stock_movements enable row level security;
revoke all on public.restaurant_stock_movements from anon, authenticated;
grant select on public.restaurant_stock_movements to authenticated;
drop policy if exists "Owners read stock movements" on public.restaurant_stock_movements;
create policy "Owners read stock movements" on public.restaurant_stock_movements for select to authenticated using (public.is_business_owner(business_id));

create or replace function public.validate_restaurant_recipe()
returns trigger language plpgsql set search_path = public as $$
declare ingredient jsonb;
begin
 if not exists (select 1 from public.businesses where id = new.business_id and vertical = 'restaurant') then return new; end if;
 if new.recipe is null or new.recipe = 'null'::jsonb then return new; end if;
 if jsonb_typeof(new.recipe) <> 'array' then raise exception 'Recipe must be an array of inventory ingredients'; end if;
 for ingredient in select value from jsonb_array_elements(new.recipe) loop
   if coalesce(ingredient->>'quantity','') !~ '^[0-9]+(\.[0-9]+)?$' or (ingredient->>'quantity')::numeric <= 0 then raise exception 'Ingredient quantity must be positive'; end if;
   if not exists (select 1 from public.inventory_items where id = (ingredient->>'inventory_item_id')::uuid and business_id = new.business_id) then raise exception 'Recipe ingredient does not belong to this business'; end if;
 end loop;
 return new;
end $$;
drop trigger if exists restaurant_validate_recipe on public.product_services;
create trigger restaurant_validate_recipe before insert or update of recipe, business_id on public.product_services for each row execute function public.validate_restaurant_recipe();

create or replace function public.process_restaurant_order_stock()
returns trigger language plpgsql security definer set search_path = public as $$
declare ingredient record; available numeric;
begin
 if not exists (select 1 from public.businesses where id = new.business_id and vertical = 'restaurant') then return new; end if;
 if not public.is_business_owner(new.business_id) then raise exception 'Only the restaurant owner can change order stock'; end if;
 if new.status = 'completed' and not coalesce(old.inventory_deducted,false) then
   -- Existing order lines acquire a snapshot at their first completion.
   update public.order_items oi set recipe_snapshot = coalesce(p.recipe,'[]')
     from public.product_services p where oi.order_id = new.id and oi.product_service_id = p.id and oi.recipe_snapshot is null;
   for ingredient in
     select (r.value->>'inventory_item_id')::uuid as stock_id, sum((r.value->>'quantity')::numeric * oi.quantity) as needed
     from public.order_items oi cross join lateral jsonb_array_elements(coalesce(oi.recipe_snapshot,'[]')) r(value)
     where oi.order_id = new.id group by (r.value->>'inventory_item_id')::uuid order by stock_id
   loop
     if ingredient.needed <= 0 then raise exception 'Recipe stock quantity must be positive'; end if;
     select quantity_on_hand into available from public.inventory_items where id = ingredient.stock_id and business_id = new.business_id for update;
     if not found then raise exception 'Recipe ingredient is unavailable'; end if;
     if available < ingredient.needed then raise exception 'Insufficient stock to complete this order'; end if;
     update public.inventory_items set quantity_on_hand = quantity_on_hand - ingredient.needed where id = ingredient.stock_id;
     insert into public.restaurant_stock_movements(business_id,order_id,inventory_item_id,quantity_delta) values(new.business_id,new.id,ingredient.stock_id,-ingredient.needed);
   end loop;
   new.inventory_deducted := true;
 elsif new.status in ('cancelled','refunded') and coalesce(old.inventory_deducted,false) then
   if not exists (select 1 from public.restaurant_stock_movements where order_id = new.id)
      and exists (select 1 from public.order_items oi left join public.product_services p on p.id = oi.product_service_id
                  where oi.order_id = new.id and coalesce(oi.recipe_snapshot,p.recipe,'[]'::jsonb) <> '[]'::jsonb) then
     raise exception 'Legacy stock deduction requires reconciliation before reversal';
   end if;
   for ingredient in select inventory_item_id as stock_id, -sum(quantity_delta) as restore
     from public.restaurant_stock_movements where order_id = new.id group by inventory_item_id having sum(quantity_delta) < 0 order by inventory_item_id
   loop
     update public.inventory_items set quantity_on_hand = quantity_on_hand + ingredient.restore where id = ingredient.stock_id and business_id = new.business_id;
     insert into public.restaurant_stock_movements(business_id,order_id,inventory_item_id,quantity_delta) values(new.business_id,new.id,ingredient.stock_id,ingredient.restore);
   end loop;
   new.inventory_deducted := false;
 else new.inventory_deducted := old.inventory_deducted;
 end if;
 return new;
end $$;
revoke all on function public.process_restaurant_order_stock() from public;
drop trigger if exists restaurant_process_order_stock on public.orders;
create trigger restaurant_process_order_stock before update of status on public.orders for each row execute function public.process_restaurant_order_stock();

create or replace function public.validate_restaurant_checkout_rates()
returns trigger language plpgsql as $$
begin
 if coalesce(new.tax_rate_percent,0) not between 0 and 100 or coalesce(new.service_charge_percent,0) not between 0 and 100 then raise exception 'Checkout percentages must be between 0 and 100'; end if;
 return new;
end $$;
drop trigger if exists restaurant_validate_checkout_rates on public.business_settings;
create trigger restaurant_validate_checkout_rates before insert or update of tax_rate_percent, service_charge_percent on public.business_settings for each row execute function public.validate_restaurant_checkout_rates();

create or replace function public.guard_restaurant_order_items()
returns trigger language plpgsql set search_path = public as $$
declare order_id_to_check uuid; deducted boolean;
begin
 if tg_op = 'INSERT' then order_id_to_check := new.order_id; else order_id_to_check := old.order_id; end if;
 select inventory_deducted into deducted from public.orders where id=order_id_to_check for update;
 if coalesce(deducted,false) then
  if tg_op <> 'UPDATE' then raise exception 'An order with deducted stock cannot have its items changed'; end if;
  if (new.order_id,new.product_service_id,new.quantity,new.unit_price,new.recipe_snapshot) is distinct from
     (old.order_id,old.product_service_id,old.quantity,old.unit_price,old.recipe_snapshot) then
    raise exception 'An order with deducted stock cannot have its items changed';
  end if;
 end if;
 if tg_op='UPDATE' and old.order_id is distinct from new.order_id then
  select inventory_deducted into deducted from public.orders where id=new.order_id for update;
  if coalesce(deducted,false) then raise exception 'Cannot move items into an order with deducted stock'; end if;
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
drop trigger if exists restaurant_guard_order_items on public.order_items;
create trigger restaurant_guard_order_items before insert or update or delete on public.order_items for each row execute function public.guard_restaurant_order_items();

commit;
