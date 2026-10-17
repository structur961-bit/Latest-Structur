import fs from 'node:fs';
import { restaurantContractSql } from './restaurant-contract.mjs';
fs.writeFileSync(new URL('../supabase/restaurant_contract_check.sql', import.meta.url), restaurantContractSql());
console.log('Updated supabase/restaurant_contract_check.sql from the application whitelist.');
