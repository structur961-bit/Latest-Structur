import test from 'node:test';
import assert from 'node:assert/strict';
import {restaurantDateTime,restaurantDate} from '../src/lib/restaurantTime.js';
test('reservations use restaurant timezone independent of customer timezone',()=>{
  assert.equal(restaurantDateTime('2026-10-15T19:00','Asia/Dubai'),'2026-10-15T15:00:00.000Z');
  assert.equal(restaurantDateTime('2026-07-15T19:00','Europe/London'),'2026-07-15T18:00:00.000Z');
  assert.equal(restaurantDateTime('2026-12-15T19:00','Europe/London'),'2026-12-15T19:00:00.000Z');
});
test('reservation rejects nonexistent daylight saving time',()=>assert.throws(()=>restaurantDateTime('2026-03-29T01:30','Europe/London'),/clocks change/));
test('date minimum follows restaurant local calendar',()=>assert.equal(restaurantDate('Asia/Dubai',new Date('2026-10-15T22:00:00Z')),'2026-10-16'));
import { restaurantTotals } from '../src/lib/restaurantTotals.js';
test('checkout preview matches server percentage rounding and includes service charge in the taxable base',()=>{
 assert.deepEqual(restaurantTotals(25,{tax_rate_percent:10,service_charge_percent:5}),{subtotal:25,serviceCharge:1.25,tax:2.63,total:28.88});
});
import { restaurantDateTimeInput } from '../src/lib/restaurantTime.js';
test('owner booking editor round-trips restaurant-local time',()=>{
 const input=restaurantDateTimeInput('2027-01-15T15:00:00Z','Asia/Dubai');
 assert.equal(input,'2027-01-15T19:00');assert.equal(restaurantDateTime(input,'Asia/Dubai'),'2027-01-15T15:00:00.000Z');
});
test('reservation rejects impossible calendar dates instead of normalizing them',()=>{
 assert.throws(()=>restaurantDateTime('2027-02-30T19:00','Asia/Dubai'),/valid reservation/);
 assert.throws(()=>restaurantDateTime('2027-01-15T24:00','Asia/Dubai'),/valid reservation/);
});
