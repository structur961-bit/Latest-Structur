import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { restaurantEntities, restaurantContractSql } from '../scripts/restaurant-contract.mjs';

test('checked-in SQL contract includes every adapter entity and stays current',()=>{
 const entities=restaurantEntities();
 assert.equal(entities.length,14);
 assert.ok(entities.find(entity=>entity.table==='product_services').fields.includes('barcode'));
 assert.equal(fs.readFileSync('supabase/restaurant_contract_check.sql','utf8').replaceAll('\r\n','\n'),restaurantContractSql().replaceAll('\r\n','\n'));
});
