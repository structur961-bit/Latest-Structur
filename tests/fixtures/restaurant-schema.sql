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
