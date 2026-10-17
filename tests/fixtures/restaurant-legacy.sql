-- Legacy objects read from the hosted project on 17 October 2026.
create table menu_categories(id uuid primary key,business_id uuid not null references businesses(id),name text,sort_order integer,is_active boolean);
create table menu_items(id uuid primary key,business_id uuid not null references businesses(id),category_id uuid,name text,price numeric,currency text);
alter table inventory_items drop constraint inventory_items_product_service_id_fkey;
alter table inventory_items add constraint inventory_items_product_service_id_fkey foreign key(product_service_id) references menu_items(id) on delete set null;
create function public.deduct_inventory_on_order_complete() returns trigger language plpgsql security definer set search_path=public as $$
declare
  oi record;
  ing jsonb;
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed'
     and not coalesce(new.inventory_deducted, false) then
    for oi in
      select items.quantity, ps.recipe
      from public.order_items items
      join public.product_services ps on ps.id = items.product_service_id
      where items.order_id = new.id and ps.recipe is not null
    loop
      for ing in select * from jsonb_array_elements(oi.recipe)
      loop
        update public.inventory_items
        set quantity_on_hand = quantity_on_hand - (coalesce((ing->>'quantity')::numeric, 0) * oi.quantity)
        where id = (ing->>'inventory_item_id')::uuid;
      end loop;
    end loop;
    new.inventory_deducted := true;
  end if;
  return new;
end;
$$;
create trigger trg_deduct_inventory_on_order_complete before update on orders for each row execute function public.deduct_inventory_on_order_complete();
