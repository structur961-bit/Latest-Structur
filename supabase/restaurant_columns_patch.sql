-- Additive compatibility patch for restaurant form fields.
-- No existing rows, CHECK constraints, triggers, policies or grants are changed.
-- This is not a replacement for restaurant_setup.sql.
begin;
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
notify pgrst, 'reload schema';
commit;
