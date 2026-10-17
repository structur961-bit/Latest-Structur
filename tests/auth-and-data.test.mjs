import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync(new URL('../src/api/base44Client.js', import.meta.url), 'utf8');
const key = 'structur_supabase_session_v1';
function client(handler, session, env = { VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-test-key' }) {
  const storage = new Map(session ? [[key, JSON.stringify(session)]] : []);
  const calls = [];
  const window = { location: { hash: '', origin: 'http://localhost', pathname: '/login', search: '' }, history: { replaceState() { window.location.hash = ''; } } };
  const context = vm.createContext({
    localStorage: { getItem: name => storage.get(name) ?? null, setItem: (name, value) => storage.set(name, value), removeItem: name => storage.delete(name) },
    window, document: { title: '' }, URLSearchParams, crypto: globalThis.crypto,
    fetch: async (url, options) => { calls.push({ url, ...options }); return handler(url, options); },
  });
  vm.runInContext(source.replaceAll('import.meta.env', JSON.stringify(env)).replace('export const base44', 'globalThis.base44'), context);
  return { api: context.base44, calls, storage, window };
}
const ok = data => new Response(JSON.stringify(data), { status: 200 });
const validSession = () => ({ access_token: 'token', refresh_token: 'refresh', expires_at: Date.now() / 1000 + 3600 });

test('partial updates preserve all unspecified database columns', async () => {
  const { api, calls } = client((url, options) => ok([{ id: 'record', ...JSON.parse(options.body) }]), validSession());
  for (const [entity, patch] of Object.entries({ Business: { name: 'New name' }, ProductService: { is_active: false }, InventoryItem: { cost: 2 }, Booking: { notes: 'Changed' }, Campaign: { name: 'New campaign' }, Payment: { status: 'refunded' }, OrderItem: { quantity: 3 } })) {
    await api.entities[entity].update('record', patch);
    assert.deepEqual(JSON.parse(calls.at(-1).body), patch, entity);
  }
});
test('explicit alias updates, including clearing a barcode, are preserved', async () => {
  const { api, calls } = client(() => ok([{ id: 'item' }]), validSession());
  await api.entities.ProductService.update('item', { barcode_optional: '' });
  assert.deepEqual(JSON.parse(calls.at(-1).body), { barcode: null });
  await api.entities.InventoryItem.update('item', { qty_on_hand: 0 });
  assert.deepEqual(JSON.parse(calls.at(-1).body), { quantity_on_hand: 0 });
  await api.entities.Business.update('item', { opening_hours_json: '{"Monday":{"open":true}}' });
  assert.deepEqual(JSON.parse(calls.at(-1).body), { opening_hours: { Monday: { open: true } } });
});
test('empty PATCH result is an actionable error', async () => {
  const { api } = client(() => ok([]), validSession());
  await assert.rejects(api.entities.Business.update('missing', { name: 'x' }), /not found|permission/);
});
test('concurrent requests share one refresh and use the refreshed token', async () => {
  let refreshes = 0;
  const { api, calls } = client(async url => {
    if (url.includes('grant_type=refresh_token')) { refreshes++; await new Promise(resolve => setTimeout(resolve, 15)); return ok({ ...validSession(), access_token: 'new-token', refresh_token: 'new-refresh' }); }
    return ok({ id: 'owner', email: 'owner@example.test', user_metadata: {} });
  }, { ...validSession(), expires_at: 1 });
  await Promise.all([api.auth.me(), api.auth.me(), api.auth.me()]);
  assert.equal(refreshes, 1);
  assert.ok(calls.filter(c => c.url.endsWith('/user')).every(c => c.headers.Authorization === 'Bearer new-token'));
});
test('transient refresh failure preserves session for retry', async () => {
  const { api, storage } = client(() => { throw new Error('Network unavailable'); }, { ...validSession(), expires_at: 1 });
  await assert.rejects(api.auth.me(), /Network unavailable/);
  assert.ok(storage.has(key));
});
test('rejected refresh clears the invalid session', async () => {
  const { api, storage } = client(() => new Response('{"message":"Invalid refresh token"}', { status: 400 }), { ...validSession(), expires_at: 1 });
  await assert.rejects(api.auth.me(), /Invalid refresh/);
  assert.equal(storage.has(key), false);
});
test('user-controlled role metadata cannot grant admin', async () => {
  const { api } = client(() => ok({ id: 'owner', user_metadata: { role: 'admin' } }), validSession());
  assert.equal((await api.auth.me()).role, 'business_owner');
});
test('publishable key works for the owner client', async () => {
  const { api, calls } = client(() => ok({ user: { id: 'owner' } }), null, { VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' });
  await api.auth.register({ email: ' OWNER@EXAMPLE.TEST ', password: '123456' });
  assert.equal(calls[0].headers.apikey, 'sb_publishable_test');
  assert.equal(JSON.parse(calls[0].body).email, 'owner@example.test');
});
test('logout clears expired sessions even when the server fails', async () => {
  const { api, storage, window } = client(() => { throw new Error('offline'); }, { ...validSession(), expires_at: 1 });
  await api.auth.logout('//external.test');
  assert.equal(storage.has(key), false);
  assert.equal(window.location.href, '/login');
});
test('registration and recovery reject short passwords before contacting server', async () => {
  const { api, calls } = client(() => ok({}));
  await assert.rejects(api.auth.register({ email: 'owner@example.test', password: '123' }), /at least 6/);
  await assert.rejects(api.auth.resetPassword({ newPassword: '123' }), /at least 6/);
  assert.equal(calls.length, 0);
});
test('email confirmation tokens are captured and removed from the URL', async () => {
  const { api, storage, window } = client(() => ok({ id: 'owner' }));
  window.location.hash = '#access_token=confirmed&refresh_token=refresh&expires_in=3600&type=signup';
  await api.auth.me();
  assert.equal(JSON.parse(storage.get(key)).access_token, 'confirmed');
  assert.equal(window.location.hash, '');
});

test('entity lists paginate beyond the Supabase row limit and honor explicit limits', async () => {
  const records = Array.from({ length: 1100 }, (_, i) => ({ id: String(i), full_name: 'Customer' }));
  const { api, calls } = client(url => {
    const params = new URL(url).searchParams;
    const offset = Number(params.get('offset'));
    return ok(records.slice(offset, offset + Number(params.get('limit'))));
  }, validSession());
  assert.equal((await api.entities.Customer.filter({ business_id: 'business' })).length, 1100);
  assert.equal(calls.length, 3);
  assert.equal((await api.entities.Customer.filter({}, '-created_date', 700)).length, 700);
});
test('provider list reflects project configuration and maps Microsoft to Azure', async () => {
  const { api } = client(() => ok({ external: { google: true, azure: true, apple: false } }));
  assert.deepEqual(Array.from(await api.auth.getProviders()), ['google', 'microsoft']);
});

test('non-JSON database failure retains its HTTP status', async () => {
  const { api } = client(() => new Response('Bad Gateway', { status: 502 }), validSession());
  await assert.rejects(api.entities.Business.filter({}), error => error.status === 502 && error.message.includes('502'));
});

test('canonical schema adapters use existing JSON settings and parent-linked order items',async()=>{
 const {api,calls}=client((url,options)=>ok([{id:'00000000-0000-4000-8000-000000000001',...JSON.parse(options.body||'{}')}]),validSession());
 await api.entities.BusinessSettings.update('settings',{payment_rules_json:'{"cash":{"is_enabled":true}}'});
 assert.deepEqual(JSON.parse(calls.at(-1).body),{payment_rules:{cash:{is_enabled:true}}});
 const order=await api.entities.Order.update('order',{notes:'Table note',subtotal:10,service_charge:1,tax:1.1,total:12.1});
 assert.equal(order.customer_notes,'Table note');assert.equal(order.order_number,'ORD-00000000');
 await api.entities.OrderItem.create({business_id:'obsolete',order_id:'order',product_service_id:'product',quantity:2,unit_price:10,modifiers_json:'[]',name_snapshot:'Meal',line_total:20});
 assert.ok(calls.at(-1).url.includes('/order_items'));
 assert.deepEqual(JSON.parse(calls.at(-1).body),{order_id:'order',product_service_id:'product',quantity:2,unit_price:10,modifiers:[],name_snapshot:'Meal'});
 await api.entities.ProductService.create({business_id:'business',name:'Meal',price:10,recipe:[{inventory_item_id:'stock',quantity:0.2}]});
 assert.ok(calls.at(-1).url.includes('/product_services'));
 await api.entities.Category.create({business_id:'business',name:'Mains'});assert.ok(calls.at(-1).url.includes('/categories'));
});
