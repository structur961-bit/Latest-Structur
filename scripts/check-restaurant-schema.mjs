import fs from 'node:fs';
import { restaurantEntities, restaurantRpcs } from './restaurant-contract.mjs';
const env={...process.env};
for(const name of ['.env','.env.local'])if(fs.existsSync(name))for(const line of fs.readFileSync(name,'utf8').split(/\r?\n/)){
 const match=/^([A-Z_]+)\s*=\s*(.*)$/.exec(line);if(match)env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');
}
const url=env.VITE_SUPABASE_URL, key=env.VITE_SUPABASE_ANON_KEY||env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key)throw new Error('Supabase public configuration is missing.');
const probes={
 restaurant_public_businesses:['id','name','slug','currency','timezone'],
 restaurant_public_categories:['id','business_id','name','sort_order'],
 restaurant_public_products:['id','business_id','category_id','name','price','variants','modifiers'],
 restaurant_public_locations:['id','business_id','name','is_active'],
};
let failed=false;
// An optional signed-in owner's JWT lets this read-only checker inspect private
// table contracts after RLS is enabled. Never put that token in a VITE variable.
const ownerToken=env.SUPABASE_USER_ACCESS_TOKEN;
for(const {table,fields} of restaurantEntities()){
 const r=await fetch(`${url}/rest/v1/${table}?select=${fields.join(',')}&limit=0`,{headers:{apikey:key,...(ownerToken?{Authorization:`Bearer ${ownerToken}`}:{})},signal:AbortSignal.timeout(10000)});
 if(r.ok)console.log(`PASS table columns ${table}: ${fields.length} fields`);
 else if(!ownerToken&&(r.status===401||r.status===403))console.log(`UNVERIFIED table columns ${table}: owner JWT or restaurant_contract_check.sql required`);
 else{const body=await r.json().catch(()=>({}));console.log(`FAIL table columns ${table}: HTTP ${r.status} ${body.message||''}`);failed=true;}
}
for(const [table,columns] of Object.entries(probes)){
 const r=await fetch(`${url}/rest/v1/${table}?select=${columns.join(',')}&limit=0`,{headers:{apikey:key},signal:AbortSignal.timeout(10000)});
 console.log(`${r.ok?'PASS':'FAIL'} public schema ${table}: HTTP ${r.status}`);failed ||= !r.ok;
}
// OpenAPI describes available RPCs without invoking checkout/payment writes.
const documentToken=ownerToken||(key.startsWith('eyJ')?key:null);
const api=await fetch(`${url}/rest/v1/`,{headers:{apikey:key,Accept:'application/openapi+json',...(documentToken?{Authorization:`Bearer ${documentToken}`}:{})},signal:AbortSignal.timeout(10000)});
if(api.ok){
 const document=await api.json();
 for(const signature of restaurantRpcs){
  const name=signature.match(/^public\.(\w+)\(/)[1];
  if(document.paths?.[`/rpc/${name}`])console.log(`PASS RPC exposed ${name}`);
  else if(name==='set_order_payment_status'&&!ownerToken)console.log(`UNVERIFIED owner RPC ${name}: use restaurant_contract_check.sql`);
  else{console.log(`FAIL public RPC missing ${name}`);failed=true;}
 }
}else if(api.status===401||api.status===403){
 console.log(`UNVERIFIED RPC discovery: OpenAPI access denied; run restaurant_contract_check.sql`);
}else{console.log(`FAIL RPC discovery: HTTP ${api.status}; run restaurant_contract_check.sql`);failed=true;}
for(const table of ['customers','orders','order_items','bookings','inventory_items','business_settings','staff_memberships','payments','loyalty_ledger','product_services','businesses']){
 const r=await fetch(`${url}/rest/v1/${table}?select=id&limit=1`,{headers:{apikey:key},signal:AbortSignal.timeout(10000)});
 const body=await r.json();const exposed=r.ok&&Array.isArray(body)&&body.length>0;
 // An empty table behind a successful SELECT is inconclusive; migrated grants
 // should reject anonymous direct SELECT, not merely happen to return no rows.
 const denied=r.status===401||r.status===403;
 console.log(`${denied?'PASS':exposed?'FAIL':'UNVERIFIED'} anonymous isolation ${table}: HTTP ${r.status}${exposed?' (row access enabled)':''}`);
 failed ||= !denied;
}
process.exitCode=failed?1:0;
