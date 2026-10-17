import { chromium } from 'file:///C:/Users/David/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,channel:'msedge'});
const context=await browser.newContext({viewport:{width:1365,height:900}});
const page=await context.newPage();
const issues=[];page.on('pageerror',e=>issues.push(e.message));
const calls=[];
const user={id:'00000000-0000-4000-8000-000000000001',email:'audit@example.test',user_metadata:{},app_metadata:{}};
const business={id:'00000000-0000-4000-8000-000000000002',owner_user_id:user.id,name:'Audit Cafe',slug:'audit-cafe',vertical:'restaurant',currency:'AED',timezone:'Asia/Dubai',storefront_published:true,opening_hours:{Thursday:{open:true,from:'09:00 AM',to:'06:00 PM'}},created_at:'2026-10-15T00:00:00Z'};
const categories=[{id:'category',business_id:business.id,name:'Coffee',sort_order:0,is_active:true}];
const products=[{id:'product',business_id:business.id,category_id:'category',name:'Espresso',description:'Coffee',price:15,currency:'AED',is_active:true,type:'menu_item',dietary_tags:[],variants:[{name:'Small',price:15}],modifiers:[],created_at:'2026-10-15T00:00:00Z'}];
const settings={id:'settings',business_id:business.id,tax_rate_percent:10,service_charge_percent:5,payment_rules:{cash:{is_enabled:true}},receipt_footer_text:''};
const inventory=[{id:'stock',business_id:business.id,name:'Coffee beans',unit:'kg',quantity_on_hand:10,low_stock_threshold:1}];
let loginFails=true;
let failProductLoads=false;
let largeCustomerList=false;
await page.route('**/*.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url());const path=url.pathname;calls.push({path,method:req.method(),body:req.postDataJSON()});
 let body={},status=200;
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'}});
 if(path.endsWith('/settings')&&path.includes('/auth/'))body={external:{email:true,google:false,azure:false,apple:false}};
 else if(path.endsWith('/signup'))body={id:user.id};
 else if(path.endsWith('/resend')||path.endsWith('/recover')||path.endsWith('/logout'))body={};
 else if(path.endsWith('/token')){if(loginFails){status=400;body={msg:'Invalid login credentials'};}else body={access_token:'audit-token',refresh_token:'audit-refresh',expires_in:3600,user};}
 else if(path.endsWith('/user'))body=user;
 else if(path.endsWith('/rpc/get_restaurant_checkout_settings'))body={tax_rate_percent:settings.tax_rate_percent,service_charge_percent:settings.service_charge_percent};
 else if(path.endsWith('/rpc/place_restaurant_order'))body={id:'order',order_number:'AUDIT-ORDER',total:15,currency:'AED'};
 else if(path.endsWith('/rpc/request_restaurant_booking'))body={id:'booking',status:'pending'};
 else {
   const table=path.split('/').pop();
   const tables={businesses:[business],locations:[],categories,product_services:products,business_settings:[settings],inventory_items:inventory,orders:[],order_items:[],bookings:[],customers:[],loyalty_ledger:[],payments:[],campaigns:[],staff_memberships:[],restaurant_public_businesses:[business],restaurant_public_categories:categories,restaurant_public_products:products,restaurant_public_locations:[]};
   if(!(table in tables))throw new Error('Unexpected table: '+table);
   body=tables[table];
   if(table==='product_services'&&req.method()==='GET'&&failProductLoads){status=503;body={message:'Menu temporarily unavailable'};}
   if(table==='customers'&&req.method()==='GET'&&largeCustomerList){
     const rows=Array.from({length:601},(_,i)=>({id:'customer-'+i,business_id:business.id,full_name:'Customer '+i,loyalty_points:0,total_spent:0}));
     const offset=Number(url.searchParams.get('offset')||0),limit=Number(url.searchParams.get('limit')||500);
     body=rows.slice(offset,offset+limit);
   }
   const forbidden={order_items:['business_id','menu_item_id','selected_variant','selected_modifiers','line_total'],orders:['order_number','channel','currency','customer_notes','discount','delivery_fee'],business_settings:['payment_rules_json','tax_rate','service_charge_rate','receipt_footer'],staff_memberships:['is_active']};
   if(req.method()==='PATCH'||req.method()==='POST')for(const field of forbidden[table]||[])assert.ok(!(field in req.postDataJSON()),'Invalid '+table+' field '+field);
   if(req.method()==='PATCH'){const payload=req.postDataJSON();if(table==='businesses')Object.assign(business,payload);body=[{id:table==='businesses'?business.id:'product',...payload}];}
   if(req.method()==='POST'){body=[{id:'new-record',...req.postDataJSON()}];}
 }
 await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(body)});
});
fs.mkdirSync('audit-screenshots',{recursive:true});
try{
 await page.goto('http://127.0.0.1:5173/dashboard');await page.waitForURL('**/login');
 await page.locator('#email').fill(user.email);await page.locator('#password').fill('audit-password');await page.getByRole('button',{name:'Log in',exact:true}).click();
 await page.getByText('Invalid login credentials').waitFor();assert.equal(await page.getByRole('button',{name:/Continue with/}).count(),0);console.log('PASS protected route, login failure and disabled providers');
 await page.goto('http://127.0.0.1:5173/register');await page.locator('#email').fill(user.email);await page.locator('#password').fill('audit-password');await page.locator('#confirm').fill('mismatch');await page.getByRole('button',{name:'Create account',exact:true}).click();await page.getByText('Passwords do not match').waitFor();
 await page.locator('#confirm').fill('audit-password');await page.getByRole('button',{name:'Create account',exact:true}).click();await page.getByRole('heading',{name:'Check your email'}).waitFor();await page.getByRole('button',{name:'Resend confirmation'}).click();assert.ok(calls.some(c=>c.path.endsWith('/resend')));console.log('PASS registration validation, confirmation and resend');
 loginFails=false;await page.goto('http://127.0.0.1:5173/login');await page.locator('#email').fill(user.email);await page.locator('#password').fill('audit-password');await page.getByRole('button',{name:'Log in',exact:true}).click();await page.waitForURL('**/dashboard');await page.getByText('Audit Cafe',{exact:true}).waitFor();console.log('PASS login to restaurant dashboard');
 for(const path of ['products','orders','bookings','inventory','customers','loyalty','payments','campaigns','reports','settings']){
  await page.goto('http://127.0.0.1:5173/dashboard/'+path);await page.locator('h1').waitFor();assert.equal(await page.getByText('Restaurant setup needed').count(),0);
 }
 console.log('PASS all 10 restaurant dashboard routes render');
 failProductLoads=true;await page.goto('http://127.0.0.1:5173/dashboard/products');
 await page.getByRole('alert').filter({hasText:'Menu temporarily unavailable'}).waitFor();
 failProductLoads=false;await page.getByRole('button',{name:'Retry',exact:true}).click();
 await page.getByText('Espresso',{exact:true}).waitFor();console.log('PASS menu load failure is visible and Retry recovers');
 largeCustomerList=true;await page.goto('http://127.0.0.1:5173/dashboard/customers');
 await page.getByText('Customer 600',{exact:true}).waitFor();await page.locator('input').fill('Customer 600');
 await page.getByText('Customer 600',{exact:true}).waitFor();largeCustomerList=false;
 console.log('PASS customer beyond 500 records remains searchable');
 await page.goto('http://127.0.0.1:5173/dashboard/bookings');await page.getByRole('button',{name:/new booking/i}).click();
 const bookingDialog=page.getByRole('dialog');await bookingDialog.locator('input').nth(0).fill('Audit Booking Customer');await bookingDialog.locator('input').nth(1).fill('5550000');await bookingDialog.locator('input[type=datetime-local]').fill('2027-01-15T19:00');await bookingDialog.locator('input').nth(3).fill('A1');await bookingDialog.getByRole('button',{name:'Save',exact:true}).click();await bookingDialog.waitFor({state:'hidden'});
 const ownerBooking=calls.find(c=>c.path.endsWith('/bookings')&&c.method==='POST');assert.equal(ownerBooking.body.start_at,'2027-01-15T15:00:00.000Z');assert.equal(ownerBooking.body.table_label,'A1');assert.equal('customer_name' in ownerBooking.body,false);console.log('PASS owner booking uses canonical fields and restaurant timezone');
 await page.goto('http://127.0.0.1:5173/dashboard/products');await page.getByRole('button',{name:'Add Item',exact:true}).first().click();await page.getByRole('dialog').waitFor();await page.getByPlaceholder('Item name').fill('New Coffee');await page.getByPlaceholder('0.00').fill('20');await page.getByRole('button',{name:'Add ingredient',exact:true}).click();await page.getByRole('combobox',{name:'Ingredient 1',exact:true}).selectOption('stock');await page.getByRole('spinbutton',{name:'Ingredient quantity 1',exact:true}).fill('0.02');await page.getByRole('button',{name:'Save Item',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.ok(calls.some(c=>c.path.endsWith('/product_services')&&c.method==='POST'));assert.deepEqual(calls.find(c=>c.path.endsWith('/product_services')&&c.method==='POST').body.recipe,[{inventory_item_id:'stock',quantity:0.02}]);console.log('PASS canonical product creation and recipe submit');
 await page.goto('http://127.0.0.1:5173/dashboard/inventory');await page.getByRole('button',{name:'Add Item',exact:true}).click();const stockDialog=page.getByRole('dialog');await stockDialog.getByPlaceholder('e.g. Chicken breast').fill('Fractional ingredient');await stockDialog.locator('input[type=number]').nth(0).fill('0.5');await stockDialog.locator('input[type=number]').nth(1).fill('0.2');await stockDialog.getByRole('button',{name:'Save',exact:true}).click();await stockDialog.waitFor({state:'hidden'});const fractionalStock=calls.find(c=>c.path.endsWith('/inventory_items')&&c.method==='POST');assert.equal(fractionalStock.body.quantity_on_hand,0.5);assert.equal(fractionalStock.body.low_stock_threshold,0.2);console.log('PASS fractional inventory quantities save to canonical numeric columns');
 await page.goto('http://127.0.0.1:5173/dashboard/settings');await page.getByRole('button',{name:/save changes/i}).waitFor();const before=calls.filter(c=>c.method==='PATCH').length;await page.getByRole('button',{name:/copy link/i}).click();await page.waitForTimeout(200);assert.equal(calls.filter(c=>c.method==='PATCH').length,before);await page.screenshot({path:'audit-screenshots/settings.png',fullPage:true});console.log('PASS copy storefront link does not save settings');
 await page.locator('#tax-rate').fill('10');await page.locator('#service-rate').fill('5');await page.getByRole('button',{name:'Save checkout settings',exact:true}).click();await page.getByText('Checkout settings saved.',{exact:true}).waitFor();assert.ok(calls.some(c=>c.path.endsWith('/business_settings')&&c.method==='PATCH'&&c.body.tax_rate_percent===10));console.log('PASS canonical tax and service settings save');
 await page.goto('http://127.0.0.1:5173/restaurant/audit-cafe');await page.getByRole('heading',{name:'Audit Cafe'}).waitFor();await page.getByText('Open today').count();await page.getByRole('button',{name:'Add to order'}).click();await page.getByRole('button',{name:/Cart/}).click();const cart=page.getByRole('dialog');const inputs=cart.locator('input');await inputs.nth(0).fill('Audit Customer');await inputs.nth(1).fill('5550000');await cart.getByText('Service charge (5%)',{exact:true}).waitFor();await cart.getByText('Tax (10%)',{exact:true}).waitFor();await cart.getByRole('button',{name:/place order/i}).click();await page.getByText('Order placed',{exact:true}).waitFor();assert.ok(calls.some(c=>c.path.endsWith('/place_restaurant_order')));await page.getByRole('button',{name:'Done',exact:true}).click();console.log('PASS public menu, cart and order confirmation');
 const reserve=page.locator('#reserve');await reserve.locator('input').nth(0).fill('Audit Customer');await reserve.locator('input').nth(1).fill('5550000');await reserve.locator('input[type=date]').fill('2027-01-15');await reserve.locator('input[type=time]').fill('19:00');await reserve.getByRole('button',{name:'Request a table'}).click();await page.getByText('Request received',{exact:true}).waitFor();const booking=calls.find(c=>c.path.endsWith('/request_restaurant_booking'));assert.equal(booking.body.p_payload.start_at,'2027-01-15T15:00:00.000Z');console.log('PASS public reservation submits in restaurant timezone');
 await page.screenshot({path:'audit-screenshots/storefront.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:5173/restaurant/audit-cafe');await page.getByRole('heading',{name:'Audit Cafe'}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:'audit-screenshots/storefront-mobile.png',fullPage:true});
 await page.goto('http://127.0.0.1:5173/dashboard/products');await page.getByText('Espresso',{exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:'audit-screenshots/products-mobile.png',fullPage:true});console.log('PASS mobile storefront and products fit viewport');
 await page.goto('http://127.0.0.1:5173/reset-password#access_token=recovery&refresh_token=audit-refresh&expires_in=3600&type=recovery');await page.locator('#password').fill('new-password');await page.locator('#confirm').fill('new-password');await page.getByRole('button',{name:/reset password/i}).click();await page.waitForURL('**/login');assert.equal(await page.evaluate(()=>localStorage.getItem('structur_supabase_session_v1')),null);console.log('PASS password recovery clears session and returns to login');
 assert.deepEqual(issues,[]);console.log('PASS no uncaught browser errors');
}catch(e){await page.screenshot({path:'audit-screenshots/failure.png',fullPage:true});console.error('FAIL',e.message);console.error('PAGE',await page.locator('body').innerText().then(s=>s.slice(0,1500)));process.exitCode=1;}
finally{await browser.close();}
