import fs from 'node:fs';

// Read the adapter's actual write whitelist so a separate hand-written list
// cannot miss fields introduced by a form change.
export function restaurantEntities() {
  const source = fs.readFileSync(new URL('../src/api/base44Client.js', import.meta.url), 'utf8');
  const config = source.slice(source.indexOf('const entityConfig = {'), source.indexOf('function requireSupabase'));
  const entities = [...config.matchAll(/(\w+): \{ table: '(\w+)', fields: \[([^\]]*)\]/g)].map(match => ({
    entity: match[1], table: match[2],
    fields: ['id', 'created_at', ...[...match[3].matchAll(/'(\w+)'/g)].map(field => field[1])],
  }));
  if (!entities.length) throw new Error('Could not read the entity whitelist; update the contract parser.');
  const names = [...config.matchAll(/^\s+(\w+):/gm)];
  if (entities.length !== names.length) throw new Error('An entity definition was not parsed; update the contract parser.');
  return entities;
}

export const restaurantRpcs = [
  'public.place_restaurant_order(jsonb)',
  'public.request_restaurant_booking(jsonb)',
  'public.get_restaurant_checkout_settings(uuid)',
  'public.set_order_payment_status(uuid,text)',
];

export function restaurantContractSql() {
  const values = restaurantEntities().flatMap(({table, fields}) => fields.map(field => `('${table}','${field}')`)).join(',\n');
  return `-- Generated from src/api/base44Client.js by scripts/write-restaurant-contract.mjs.
-- Read-only. Every row should report present=true. Does not prove RLS or trigger correctness.
with expected(table_name,column_name) as (values
${values}
)
select e.table_name,e.column_name,c.data_type,c.is_nullable,c.column_name is not null as present
from expected e left join information_schema.columns c
 on c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name
order by e.table_name,e.column_name;

select signature,to_regprocedure(signature) is not null as present
from (values ${restaurantRpcs.map(name=>`('${name}')`).join(',')}) as required(signature);
`;
}
