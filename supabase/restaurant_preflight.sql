-- Read-only preflight for the existing Supabase restaurant schema.
-- Run before restaurant_setup.sql. Do not remove an unknown trigger blindly.

select c.relname as table_name, t.tgname as trigger_name, p.proname as function_name,
       pg_get_triggerdef(t.oid) as trigger_definition, pg_get_functiondef(p.oid) as function_definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
where n.nspname='public' and not t.tgisinternal
  and c.relname in ('orders','order_items','product_services','loyalty_ledger','payments')
order by c.relname,t.tgname;

select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public'
  and tablename in ('businesses','categories','product_services','orders','order_items','customers','bookings','inventory_items','business_settings','staff_memberships','payments','loyalty_ledger','suppliers','purchase_orders')
order by tablename,policyname;

select table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema='public'
  and table_name in ('businesses','categories','product_services','orders','order_items','customers','bookings','inventory_items','business_settings','staff_memberships','payments','loyalty_ledger')
order by table_name,ordinal_position;

-- Aggregate-only checks avoid printing customer contact details.
select 'duplicate_business_settings_groups' as check_name,count(*) as issue_count
from (select business_id from public.business_settings group by business_id having count(*)>1) d
union all
select 'invalid_checkout_rates',count(*) from public.business_settings
where coalesce(tax_rate_percent,0) not between 0 and 100 or coalesce(service_charge_percent,0) not between 0 and 100
union all
select 'non_array_recipes',count(*) from public.product_services where recipe is not null and jsonb_typeof(recipe) not in ('array','null')
union all
select 'menu_currency_mismatches',count(*) from public.product_services p join public.businesses b on b.id=p.business_id
where b.vertical='restaurant' and p.currency is distinct from b.currency
union all
select 'owners_missing_auth_user',count(*) from public.businesses b where b.owner_user_id is not null
and not exists(select 1 from auth.users u where u.id=b.owner_user_id)
union all
select 'completed_orders_with_legacy_stock_flag',count(*) from public.orders where inventory_deducted=true;

-- Column names alone do not reveal rejected workflow states or legacy FKs.
select conrelid::regclass as table_name,conname,pg_get_constraintdef(oid) as definition
from pg_constraint where connamespace='public'::regnamespace
 and conrelid in ('public.bookings'::regclass,'public.orders'::regclass,'public.inventory_items'::regclass)
order by conrelid::regclass::text,conname;
