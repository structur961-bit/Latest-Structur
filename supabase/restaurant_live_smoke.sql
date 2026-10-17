-- Administrator verification against the hosted schema and Supabase roles.
-- All synthetic records and writes are rolled back, including on any error.
-- Uses one existing Auth user ID; does not create accounts or send email.
begin;
do $$
declare
 owner_id uuid; biz uuid:=gen_random_uuid(); draft uuid:=gen_random_uuid();
 category uuid:=gen_random_uuid(); product uuid:=gen_random_uuid(); stock uuid:=gen_random_uuid();
 result jsonb; reservation jsonb; order_id uuid; customer uuid; balance numeric; affected integer;
begin
 select id into owner_id from auth.users order by id limit 1;
 if owner_id is null then raise exception 'An existing Auth user is required for this test'; end if;
 insert into public.businesses(id,owner_user_id,name,slug,vertical,currency,timezone,storefront_published)
 values(biz,owner_id,'Restaurant smoke check','restaurant-smoke-'||biz::text,'restaurant','USD','UTC',true),
       (draft,owner_id,'Draft smoke check','restaurant-smoke-'||draft::text,'restaurant','USD','UTC',false);
 insert into public.categories(id,business_id,name,description) values(category,biz,'Smoke category','Description');
 insert into public.inventory_items(id,business_id,name,quantity_on_hand,unit) values(stock,biz,'Smoke ingredient',10,'kg');
 insert into public.product_services(id,business_id,category_id,name,price,currency,barcode,recipe)
 values(product,biz,category,'Smoke meal',12.5,'USD',product::text,jsonb_build_array(jsonb_build_object('inventory_item_id',stock,'quantity',0.2)));
 update public.inventory_items set product_service_id=product where id=stock;
 insert into public.business_settings(business_id,tax_rate_percent,service_charge_percent) values(biz,10,5);

 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{"role":"anon"}',true);
 set local role anon;
 if (select count(*) from public.restaurant_public_businesses where id=biz)<>1 then raise exception 'Published restaurant missing'; end if;
 if exists(select 1 from public.restaurant_public_businesses where id=draft) then raise exception 'Draft restaurant exposed'; end if;
 begin
  perform 1 from public.customers limit 1;
  raise exception 'Anonymous customer reads were allowed';
 exception when insufficient_privilege then null;
 end;
 result:=public.place_restaurant_order(jsonb_build_object('business_id',biz,'customer',jsonb_build_object('full_name','Smoke customer','phone','SMOKE-'||biz::text),'items',jsonb_build_array(jsonb_build_object('product_service_id',product,'quantity',2,'price',0.01))));
 if (result->>'total')::numeric<>28.88 then raise exception 'Server checkout total mismatch: %',result->>'total'; end if;
 order_id:=(result->>'id')::uuid;
 reservation:=public.request_restaurant_booking(jsonb_build_object('business_id',biz,'customer',jsonb_build_object('full_name','Smoke customer','phone','SMOKE-'||biz::text),'party_size',2,'start_at',now()+interval '1 day'));
 if reservation->>'status'<>'pending' then raise exception 'Public reservation not pending'; end if;
 reset role;

 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 set local role authenticated;
 select customer_id into customer from public.orders where id=order_id;
 if customer is null then raise exception 'Owner cannot read order'; end if;
 update public.bookings set status='seated' where id=(reservation->>'id')::uuid;
 insert into public.payments(business_id,order_id,customer_id,amount,currency,status,method) values(biz,order_id,customer,10,'USD','paid','cash');
 if (select payment_status from public.orders where id=order_id)<>'partial' then raise exception 'Partial payment not reflected'; end if;
 perform public.set_order_payment_status(order_id,'paid');
 if (select payment_status from public.orders where id=order_id)<>'paid' then raise exception 'Paid state not reflected'; end if;
 perform public.set_order_payment_status(order_id,'refunded');
 if (select payment_status from public.orders where id=order_id)<>'refunded' then raise exception 'Refund state not reflected'; end if;
 update public.orders set status='completed' where id=order_id;
 update public.orders set status='completed' where id=order_id;
 select quantity_on_hand into balance from public.inventory_items where id=stock;
 if balance<>9.6 then raise exception 'Stock deduction not exactly once: %',balance; end if;
 update public.orders set status='refunded' where id=order_id;
 select quantity_on_hand into balance from public.inventory_items where id=stock;
 if balance<>10 then raise exception 'Refund did not restore stock: %',balance; end if;
 insert into public.loyalty_ledger(business_id,customer_id,points_delta,reason) values(biz,customer,7,'Smoke check');
 if (select loyalty_points from public.customers where id=customer)<>7 then raise exception 'Loyalty ledger not synchronized'; end if;
 reset role;

 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
 set local role authenticated;
 if exists(select 1 from public.orders where id=order_id) then raise exception 'Another identity can read private order'; end if;
 update public.product_services set price=1 where id=product;
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Another identity can change menu price'; end if;
 reset role;
end $$;
rollback;
select 'PASS: checkout, booking, inventory, payments, loyalty and tenant isolation; all test writes rolled back' as result;
