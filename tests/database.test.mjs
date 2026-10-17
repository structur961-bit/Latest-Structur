import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { restaurantEntities, restaurantRpcs } from '../scripts/restaurant-contract.mjs';
const db = new PGlite();
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const [ownerA, ownerB, ownerC, businessA, businessB, businessC, branchA, branchB, categoryA, itemA, itemB, customerA, customerB] = Array.from({length:13}, (_,i)=>id(i+1));
const setup = fs.readFileSync('supabase/restaurant_setup.sql', 'utf8').replaceAll('create extension if not exists pgcrypto;', '-- built-in UUID support');
async function asRole(role, owner, action) {
  return db.transaction(async tx => {
    await tx.exec(`set local role ${role}; select set_config('request.jwt.claim.sub', '${owner || ''}', true);`);
    return action(tx);
  });
}
const orderPayload = (extra={}) => ({ business_id: businessA, location_id: branchA, customer: { full_name: 'Customer', phone: '5550000' }, items: [{ product_service_id: itemA, quantity: 2, price: 0.01 }], ...extra });
const rpcOrder = (tx, payload=orderPayload()) => tx.query('select public.place_restaurant_order($1::jsonb) as result', [JSON.stringify(payload)]).then(r=>r.rows[0].result);
const rpcBooking = (tx, extra={}) => tx.query('select public.request_restaurant_booking($1::jsonb) as result', [JSON.stringify({ ...orderPayload(), party_size: 2, start_at: new Date(Date.now()+86400000).toISOString(), ...extra })]).then(r=>r.rows[0].result);
before(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    grant usage on schema auth to anon, authenticated; grant execute on function auth.uid(), auth.jwt() to anon, authenticated;`);
  await db.exec(fs.readFileSync('tests/fixtures/restaurant-schema.sql', 'utf8'));
  await db.exec(fs.readFileSync('tests/fixtures/restaurant-legacy.sql', 'utf8'));
  await db.exec(setup);
  // An unknown old permissive policy must not survive the migration.
  await db.exec('create policy "Legacy allow everyone" on public.customers for all using (true) with check (true); grant all on public.customers to anon;');
  await db.exec(setup);
  await db.query('insert into auth.users values ($1),($2),($3)',[ownerA,ownerB,ownerC]);
  await db.query(`insert into businesses(id, owner_user_id, name, slug, storefront_published) values ($1,$2,'Cafe A','cafe-a',true),($3,$4,'Cafe B','cafe-b',true),($5,$6,'Draft','draft',false)`,[businessA,ownerA,businessB,ownerB,businessC,ownerC]);
  await db.query(`insert into locations(id,business_id,name) values ($1,$2,'A'),($3,$4,'B')`,[branchA,businessA,branchB,businessB]);
  await db.query(`insert into categories(id,business_id,name) values ($1,$2,'Mains')`,[categoryA,businessA]);
  await db.query(`insert into product_services(id,business_id,category_id,name,price) values ($1,$2,$3,'Meal',12.50),($4,$5,null,'Other meal',30)`,[itemA,businessA,categoryA,itemB,businessB]);
  await db.query(`insert into customers(id,business_id,full_name) values ($1,$2,'A'),($3,$4,'B')`,[customerA,businessA,customerB,businessB]);
});
after(()=>db.close());

test('every application write field and RPC exists after the complete migration',async()=>{
 const columns=(await db.query("select table_name,column_name from information_schema.columns where table_schema='public'")).rows;
 const present=new Set(columns.map(row=>`${row.table_name}.${row.column_name}`));
 for(const entity of restaurantEntities())for(const field of entity.fields)assert.ok(present.has(`${entity.table}.${field}`),`${entity.table}.${field} missing`);
 for(const signature of restaurantRpcs)assert.ok((await db.query('select to_regprocedure($1) as f',[signature])).rows[0].f,signature);
});

test('additive form patch fixes every missing field on the original hosted shape and preserves data',async()=>{
 const original=new PGlite();
 try{
  await original.exec('create schema auth;create table auth.users(id uuid primary key);');
  await original.exec(fs.readFileSync('tests/fixtures/restaurant-schema.sql','utf8'));
  await original.query("insert into businesses(id,name,slug) values($1,'Preserved','preserved')",[businessA]);
  const before=(await original.query("select column_name from information_schema.columns where table_schema='public' and table_name='product_services'")).rows;
  assert.equal(before.some(row=>row.column_name==='barcode'),false);
  const patch=fs.readFileSync('supabase/restaurant_columns_patch.sql','utf8');
  await original.exec(patch);await original.exec(patch);
  const columns=(await original.query("select table_name,column_name from information_schema.columns where table_schema='public'")).rows;
  const present=new Set(columns.map(row=>`${row.table_name}.${row.column_name}`));
  for(const entity of restaurantEntities())for(const field of entity.fields)assert.ok(present.has(`${entity.table}.${field}`),`${entity.table}.${field} missing`);
  await original.query("insert into categories(id,business_id,name,description,image_url) values($1,$2,'Category','Description',null)",[categoryA,businessA]);
  await original.query("insert into product_services(business_id,category_id,name,price,barcode,sku,type,dietary_tags,variants,modifiers,is_featured,sort_order,recipe) values($1,$2,'Meal',420,'1234567890','SKU-1','menu_item',ARRAY['vegan'],'[]','[]',true,0,'[]')",[businessA,categoryA]);
  assert.equal((await original.query('select name from businesses where id=$1',[businessA])).rows[0].name,'Preserved');
  assert.equal((await original.query('select barcode from product_services')).rows[0].barcode,'1234567890');
 }finally{await original.close();}
});
test('schema bootstraps a new database and is idempotent', async()=>assert.equal((await db.query("select count(*)::int n from information_schema.tables where table_schema='public' and table_name in ('businesses','bookings','orders','payments')")).rows[0].n,4));

test('anonymous reads only published businesses', async()=>assert.equal((await asRole('anon',null,tx=>tx.query('select id from restaurant_public_businesses'))).rows.length,2));
test('anonymous users cannot read customer information or write menu items', async()=>{
  await assert.rejects(asRole('anon',null,tx=>tx.query('select * from customers')),/permission denied/);
  await assert.rejects(asRole('anon',null,tx=>tx.query("insert into product_services(business_id,name) values ($1,'Injected')",[businessA])),/permission denied/);
});
test('owners cannot read or update another restaurant private records', async()=>{
  assert.equal((await asRole('authenticated',ownerA,tx=>tx.query('select id from customers'))).rows.length,1);
  assert.equal((await asRole('authenticated',ownerA,tx=>tx.query("update customers set full_name='Changed' where id=$1 returning id",[customerB]))).rows.length,0);
});
test('owners cannot insert records into another business', async()=>{
  await assert.rejects(asRole('authenticated',ownerA,tx=>tx.query("insert into customers(business_id,full_name) values ($1,'Injected')",[businessB])),/row-level security/);

});
test('cross-business category/customer/branch references are rejected', async()=>{
  await assert.rejects(asRole('authenticated',ownerB,tx=>tx.query("insert into product_services(business_id,category_id,name) values ($1,$2,'Injected')",[businessB,categoryA])),/does not belong/);
  await assert.rejects(asRole('authenticated',ownerA,tx=>tx.query("insert into bookings(business_id,customer_id,start_at) values ($1,$2,now())",[businessA,customerB])),/does not belong/);
});
test('public order recalculates prices and inserts matching item totals', async()=>{
  const order=await asRole('anon',null,tx=>rpcOrder(tx));
  assert.equal(Number(order.total),25);
  const item=(await db.query('select * from order_items where order_id=$1',[order.id])).rows[0];
  assert.equal(Number(item.unit_price),12.5);assert.equal(Number(item.quantity)*Number(item.unit_price),25);
});
test('public orders reject foreign branch, foreign item, empty cart, invalid quantities, missing address', async()=>{
  for(const extra of [{location_id:branchB},{items:[{product_service_id:itemB,quantity:1}]},{items:[]},{items:null},{items:[{product_service_id:itemA,quantity:0}]},{items:[{product_service_id:itemA,quantity:100}]},{items:[{product_service_id:itemA,quantity:1.5}]},{order_type:'delivery'}]){
    await assert.rejects(asRole('anon',null,tx=>rpcOrder(tx,orderPayload(extra))));
  }
});
test('failed orders roll back without creating customer records', async()=>{
  const before=(await db.query('select count(*)::int n from customers')).rows[0].n;
  await assert.rejects(asRole('anon',null,tx=>rpcOrder(tx,orderPayload({customer:{full_name:'Invalid',phone:'never-stored'},items:[{product_service_id:itemB,quantity:1}]}))));
  assert.equal((await db.query('select count(*)::int n from customers')).rows[0].n,before);
});
test('unpublished restaurants cannot receive public orders or bookings', async()=>{
  await assert.rejects(asRole('anon',null,tx=>rpcOrder(tx,orderPayload({business_id:businessC}))),/unavailable/);
  await assert.rejects(asRole('anon',null,tx=>rpcBooking(tx,{business_id:businessC})),/unavailable/);
});
test('public reservations store future dates as pending', async()=>{
  const result=await asRole('anon',null,tx=>rpcBooking(tx));assert.equal(result.status,'pending');
});
test('public reservations reject past/infinite/missing times, invalid party sizes, foreign branches', async()=>{
  for(const extra of [{start_at:'2000-01-01T12:00:00Z'},{start_at:'infinity'},{start_at:null},{party_size:0},{party_size:31},{party_size:1.5},{location_id:branchB}])await assert.rejects(asRole('anon',null,tx=>rpcBooking(tx,extra)));
});
test('loyalty balance changes atomically with ledger insert and delete',async()=>{
  const row=await asRole('authenticated',ownerA,tx=>tx.query("insert into loyalty_ledger(business_id,customer_id,points_delta) values ($1,$2,7) returning id",[businessA,customerA]));
  assert.equal((await db.query('select loyalty_points from customers where id=$1',[customerA])).rows[0].loyalty_points,7);
  await asRole('authenticated',ownerA,tx=>tx.query('delete from loyalty_ledger where id=$1',[row.rows[0].id]));
  assert.equal((await db.query('select loyalty_points from customers where id=$1',[customerA])).rows[0].loyalty_points,0);
});
test('partial payments, mark paid, repeated paid, refunds, unpaid remain consistent',async()=>{
  const order=await asRole('anon',null,tx=>rpcOrder(tx));
  await asRole('authenticated',ownerA,tx=>tx.query("insert into payments(business_id,order_id,amount,status) values ($1,$2,10,'paid')",[businessA,order.id]));
  assert.equal((await db.query('select payment_status from orders where id=$1',[order.id])).rows[0].payment_status,'partial');
  for(const status of ['paid','paid','refunded','unpaid']){
    await asRole('authenticated',ownerA,tx=>tx.query('select set_order_payment_status($1,$2)',[order.id,status]));
    assert.equal((await db.query('select payment_status from orders where id=$1',[order.id])).rows[0].payment_status,status);
    const paid=(await db.query("select coalesce(sum(amount),0) as amount from payments where order_id=$1 and status='paid'",[order.id])).rows[0].amount;
    assert.equal(Number(paid),status==='paid'?25:0);
  }
  await assert.rejects(asRole('authenticated',ownerB,tx=>tx.query("select set_order_payment_status($1,'paid')",[order.id])),/unavailable/);
});
test('moving completed order to a different customer refreshes both spend totals',async()=>{
  const order=await asRole('anon',null,tx=>rpcOrder(tx));
  await asRole('authenticated',ownerA,tx=>tx.query("update orders set status='completed',customer_id=$1 where id=$2",[customerA,order.id]));
  assert.equal(Number((await db.query('select total_spent from customers where id=$1',[customerA])).rows[0].total_spent),25);
  await asRole('authenticated',ownerA,tx=>tx.query('update orders set customer_id=null where id=$1',[order.id]));
  assert.equal(Number((await db.query('select total_spent from customers where id=$1',[customerA])).rows[0].total_spent),0);
});

test('public catalog projections hide ownership and recipes and owner base tables remain private', async()=>{
 const visible=(await asRole('anon',null,tx=>tx.query('select * from restaurant_public_products'))).rows;
 assert.ok(visible.length>=2);assert.equal('recipe' in visible[0],false);assert.equal('barcode' in visible[0],false);
 const business=(await asRole('anon',null,tx=>tx.query('select * from restaurant_public_businesses'))).rows[0];
 assert.equal('owner_user_id' in business,false);
 await assert.rejects(asRole('anon',null,tx=>tx.query('select * from businesses')),/permission denied/);
 assert.equal((await asRole('authenticated',ownerA,tx=>tx.query('select id from product_services'))).rows.length,1);
});
test('order items use parent ownership without a nonexistent business_id column',async()=>{
 const order=await asRole('anon',null,tx=>rpcOrder(tx));
 const own=await asRole('authenticated',ownerA,tx=>tx.query('select * from order_items where order_id=$1',[order.id]));assert.equal(own.rows.length,1);
 const other=await asRole('authenticated',ownerB,tx=>tx.query('select * from order_items where order_id=$1',[order.id]));assert.equal(other.rows.length,0);
 await assert.rejects(asRole('authenticated',ownerB,tx=>tx.query("insert into order_items(order_id,name_snapshot,quantity,unit_price) values ($1,'Injected',1,10)",[order.id])),/row-level security|does not belong/);
});
test('checkout reads only rates, stores tax/service charge, and rejects invalid settings',async()=>{
 await asRole('authenticated',ownerA,tx=>tx.query('insert into business_settings(business_id,tax_rate_percent,service_charge_percent,payment_rules) values ($1,10,5,$2)',[businessA,JSON.stringify({private:'not-public'})]));
 const result=await asRole('anon',null,tx=>tx.query('select get_restaurant_checkout_settings($1) as settings',[businessA]));assert.deepEqual(result.rows[0].settings,{tax_rate_percent:10,service_charge_percent:5});
 const order=await asRole('anon',null,tx=>rpcOrder(tx));assert.equal(Number(order.service_charge),1.25);assert.equal(Number(order.tax),2.63);assert.equal(Number(order.total),28.88);
 const stored=(await db.query('select * from orders where id=$1',[order.id])).rows[0];assert.equal(Number(stored.total),28.88);assert.equal('currency' in stored,false);
 await assert.rejects(asRole('authenticated',ownerA,tx=>tx.query('update business_settings set tax_rate_percent=101 where business_id=$1',[businessA])),/between 0 and 100/);
 await asRole('authenticated',ownerA,tx=>tx.query('update business_settings set tax_rate_percent=0,service_charge_percent=0 where business_id=$1',[businessA]));
});
test('recipe stock deducts once on completion and refund restores the original snapshot',async()=>{
 const stock=id(100),otherStock=id(101);
 await db.query("insert into inventory_items(id,business_id,name,quantity_on_hand,unit) values($1,$2,'Beans',10,'kg'),($3,$4,'Other beans',10,'kg')",[stock,businessA,otherStock,businessB]);
 await asRole('authenticated',ownerA,tx=>tx.query('update product_services set recipe=$1 where id=$2',[JSON.stringify([{inventory_item_id:stock,quantity:1.5}]),itemA]));
 const order=await asRole('anon',null,tx=>rpcOrder(tx));
 // A later recipe edit must not change an existing order's stock requirements.
 await asRole('authenticated',ownerA,tx=>tx.query('update product_services set recipe=$1 where id=$2',[JSON.stringify([{inventory_item_id:stock,quantity:4}]),itemA]));
 for(const status of ['completed','completed']) await asRole('authenticated',ownerA,tx=>tx.query('update orders set status=$1 where id=$2',[status,order.id]));
 assert.equal(Number((await db.query('select quantity_on_hand from inventory_items where id=$1',[stock])).rows[0].quantity_on_hand),7);
 for(const status of ['refunded','refunded'])await asRole('authenticated',ownerA,tx=>tx.query('update orders set status=$1 where id=$2',[status,order.id]));
 assert.equal(Number((await db.query('select quantity_on_hand from inventory_items where id=$1',[stock])).rows[0].quantity_on_hand),10);
 assert.equal((await db.query('select count(*)::int n from restaurant_stock_movements where order_id=$1',[order.id])).rows[0].n,2);
 assert.equal((await asRole('authenticated',ownerB,tx=>tx.query('select id from restaurant_stock_movements where order_id=$1',[order.id]))).rows.length,0);
 await assert.rejects(asRole('authenticated',ownerA,tx=>tx.query('update product_services set recipe=$1 where id=$2',[JSON.stringify([{inventory_item_id:otherStock,quantity:1}]),itemA])),/does not belong/);
 await asRole('authenticated',ownerA,tx=>tx.query("update product_services set recipe='[]' where id=$1",[itemA]));
});
test('insufficient ingredient stock rolls back order status, movement rows and every stock deduction',async()=>{
 const stock=id(100),scarce=id(102);
 await db.query("insert into inventory_items(id,business_id,name,quantity_on_hand) values($1,$2,'Scarce',0)",[scarce,businessA]);
 await asRole('authenticated',ownerA,tx=>tx.query('update product_services set recipe=$1 where id=$2',[JSON.stringify([{inventory_item_id:stock,quantity:1},{inventory_item_id:scarce,quantity:1}]),itemA]));
 const order=await asRole('anon',null,tx=>rpcOrder(tx));
 await assert.rejects(asRole('authenticated',ownerA,tx=>tx.query("update orders set status='completed' where id=$1",[order.id])),/Insufficient stock/);
 assert.equal(Number((await db.query('select quantity_on_hand from inventory_items where id=$1',[stock])).rows[0].quantity_on_hand),10);
 assert.equal((await db.query('select status from orders where id=$1',[order.id])).rows[0].status,'pending');
 assert.equal((await db.query('select count(*)::int n from restaurant_stock_movements where order_id=$1',[order.id])).rows[0].n,0);
 await asRole('authenticated',ownerA,tx=>tx.query("update product_services set recipe='[]' where id=$1",[itemA]));
});

test('rerunning migration preserves canonical data and imports legacy menu data without deleting it',async()=>{
 const existing=(await db.query('select count(*)::int n from orders')).rows[0].n;
 await db.exec(`create table if not exists menu_categories(id uuid primary key,business_id uuid,name text,sort_order integer,is_active boolean);
 create table if not exists menu_items(id uuid primary key,business_id uuid,category_id uuid,name text,price numeric,currency text);
 create table suppliers(id uuid primary key,business_id uuid,name text);
 create table purchase_orders(id uuid primary key,business_id uuid);
 grant all on menu_categories,menu_items,suppliers,purchase_orders to anon,authenticated;`);
 await db.query("insert into menu_categories values($1,$2,'Legacy',0,true)",[id(200),businessC]);
 await db.query("insert into menu_items values($1,$2,$3,'Legacy meal',8,'USD')",[id(201),businessC,id(200)]);
 await db.query("insert into suppliers values($1,$2,'Private supplier')",[id(202),businessA]);
 await db.exec(setup);await db.exec(setup);
 assert.equal((await db.query('select count(*)::int n from orders')).rows[0].n,existing);
 assert.equal((await db.query('select name from product_services where id=$1',[id(201)])).rows[0].name,'Legacy meal');
 assert.equal((await db.query('select count(*)::int n from menu_items')).rows[0].n,1);
 await assert.rejects(asRole('anon',null,tx=>tx.query('select id from menu_items')),/permission denied/);
 await assert.rejects(asRole('anon',null,tx=>tx.query('select id from suppliers')),/permission denied/);
 assert.equal((await asRole('authenticated',ownerB,tx=>tx.query('select id from suppliers'))).rows.length,0);
});

test('inactive categories and mismatched currencies cannot be ordered through the public API',async()=>{
 await asRole('authenticated',ownerA,tx=>tx.query('update categories set is_active=false where id=$1',[categoryA]));
 assert.equal((await asRole('anon',null,tx=>tx.query('select id from restaurant_public_products where business_id=$1',[businessA]))).rows.length,0);
 await assert.rejects(asRole('anon',null,tx=>rpcOrder(tx)),/unavailable/);
 await asRole('authenticated',ownerA,tx=>tx.query('update categories set is_active=true where id=$1',[categoryA]));
 await asRole('authenticated',ownerA,tx=>tx.query("update product_services set currency='EUR' where id=$1",[itemA]));
 await assert.rejects(asRole('anon',null,tx=>rpcOrder(tx)),/currency/);
 await asRole('authenticated',ownerA,tx=>tx.query("update product_services set currency='USD' where id=$1",[itemA]));
});
test('deducted order items cannot change quantity or move to another order',async()=>{
 await asRole('authenticated',ownerA,tx=>tx.query('update product_services set recipe=$1 where id=$2',[JSON.stringify([{inventory_item_id:id(100),quantity:1}]),itemA]));
 const order=await asRole('anon',null,tx=>rpcOrder(tx));
 await asRole('authenticated',ownerA,tx=>tx.query("update orders set status='completed' where id=$1",[order.id]));
 await assert.rejects(asRole('authenticated',ownerA,tx=>tx.query('update order_items set quantity=10 where order_id=$1',[order.id])),/cannot have its items changed/);
 await assert.rejects(asRole('authenticated',ownerA,tx=>tx.query('delete from order_items where order_id=$1',[order.id])),/cannot have its items changed/);
 await asRole('authenticated',ownerA,tx=>tx.query("update orders set status='cancelled' where id=$1",[order.id]));
 await asRole('authenticated',ownerA,tx=>tx.query("update product_services set recipe='[]' where id=$1",[itemA]));
});
test('migration refuses competing legacy stock triggers without removing them',async()=>{
 await db.exec(`create function public.legacy_deduct_stock() returns trigger language plpgsql as $$ begin new.inventory_deducted := true; return new; end $$;
 create trigger legacy_deduct_stock before update of status on orders for each row execute function public.legacy_deduct_stock();`);
 await assert.rejects(db.exec(setup),/Reconcile legacy trigger/);await db.exec('rollback');
 assert.equal((await db.query("select count(*)::int n from pg_trigger where tgname='legacy_deduct_stock'")).rows[0].n,1);
 await db.exec('drop trigger legacy_deduct_stock on orders; drop function legacy_deduct_stock();');
 await db.exec(setup);
});

test('administrator preflight SQL runs read-only against the schema-shaped database',async()=>{
 const before=(await db.query('select count(*)::int n from orders')).rows[0].n;
 const results=await db.exec(fs.readFileSync('supabase/restaurant_preflight.sql','utf8'));
 assert.equal(results.length,5);
 assert.equal((await db.query('select count(*)::int n from orders')).rows[0].n,before);
});

test('verified legacy deduction trigger is replaced and its function remains auditable',async()=>{
 assert.equal((await db.query("select count(*)::int n from pg_trigger where tgname='trg_deduct_inventory_on_order_complete'")).rows[0].n,0);
 assert.ok((await db.query("select to_regprocedure('public.deduct_inventory_on_order_complete()') as f")).rows[0].f);
 assert.equal((await db.query("select has_function_privilege('anon','public.deduct_inventory_on_order_complete()','execute') as allowed")).rows[0].allowed,false);
});

test('inventory links target the canonical product table rather than the legacy menu',async()=>{
 await asRole('authenticated',ownerA,tx=>tx.query("insert into inventory_items(business_id,name,product_service_id) values($1,'Linked stock',$2)",[businessA,itemA]));
 await assert.rejects(asRole('authenticated',ownerA,tx=>tx.query("insert into inventory_items(business_id,name,product_service_id) values($1,'Foreign stock',$2)",[businessA,itemB])),/does not belong/);
});

test('hosted state checks accept pending bookings, seated bookings and refunded orders',async()=>{
 const booking=await asRole('anon',null,tx=>rpcBooking(tx));
 await asRole('authenticated',ownerA,tx=>tx.query("update bookings set status='seated' where id=$1",[booking.id]));
 const order=await asRole('anon',null,tx=>rpcOrder(tx));
 await asRole('authenticated',ownerA,tx=>tx.query("update orders set status='refunded' where id=$1",[order.id]));
 await assert.rejects(asRole('authenticated',ownerA,tx=>tx.query("update orders set status='invalid' where id=$1",[order.id])),/orders_status_check/);
});

test('JSON null recipes behave as recipes with no ingredients',async()=>{
 await asRole('authenticated',ownerA,tx=>tx.query("update product_services set recipe='null'::jsonb where id=$1",[itemA]));
 const order=await asRole('anon',null,tx=>rpcOrder(tx));
 await asRole('authenticated',ownerA,tx=>tx.query("update orders set status='completed' where id=$1",[order.id]));
 await asRole('authenticated',ownerA,tx=>tx.query("update orders set status='refunded' where id=$1",[order.id]));
 await asRole('authenticated',ownerA,tx=>tx.query("update product_services set recipe=null where id=$1",[itemA]));
});
