import fs from 'node:fs';
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
for(const [table,columns] of Object.entries(probes)){
 const r=await fetch(`${url}/rest/v1/${table}?select=${columns.join(',')}&limit=0`,{headers:{apikey:key},signal:AbortSignal.timeout(10000)});
 console.log(`${r.ok?'PASS':'FAIL'} public schema ${table}: HTTP ${r.status}`);failed ||= !r.ok;
}
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
