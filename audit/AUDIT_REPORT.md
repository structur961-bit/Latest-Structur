# Restaurant schema correction and verification

Completed local verification: 16 October 2026, Asia/Dubai.

## Result and deployment boundary

The restaurant application now follows the database shown in the supplied diagram and verified through read-only REST probes. The previous implementation used a separate, empty catalog and assumed columns that do not exist on the real orders, order items and settings tables.

The local code, migration and tests are complete for the documented owner/menu/order/reservation/inventory/payment flows. **The hosted database is not updated.** No administrator database connection, SQL execution connector or authenticated Supabase dashboard session is available. Public connection values cannot execute schema migrations. The live read-only check on 16 October still returns private row IDs anonymously and reports the new views missing. No live rows or user accounts were changed.

The deployment artifacts are `supabase/restaurant_preflight.sql` and `supabase/restaurant_setup.sql`. The former is read-only. The latter is a complete, transactional migration that replaces permissive policies on the named tables, adds only missing support structures, preserves rows and imports the previous separate menu catalog if it contains records. It deliberately refuses competing legacy stock/loyalty/payment triggers rather than guessing which implementation to remove.

## Verified schema mapping

| Area | Actual database contract | Correction |
| --- | --- | --- |
| Menu | `categories`, `product_services` | Removed active use of `menu_categories` and `menu_items`; retained legacy records through migration. |
| Recipes | `product_services.recipe` | Ingredient editor and validation use inventory IDs/quantities. Order lines receive recipe snapshots. |
| Order items | `order_id`, `product_service_id`, `quantity`, `unit_price`, `modifiers`, `notes` | Removed nonexistent `business_id`, `menu_item_id`, `selected_variant`, `selected_modifiers` and `line_total` from writes. Ownership follows the parent order; displayed line total is derived. |
| Orders | `subtotal`, `tax`, `service_charge`, `total`, `inventory_deducted`, `table_label`, `notes` | Uses real totals/notes. Display reference derives from the UUID. Removed assumptions about stored order number, channel and currency. Delivery address is an explicit additive migration field. |
| Settings | JSONB `payment_rules`; `tax_rate_percent`, `service_charge_percent`, `receipt_footer_text` | Adapter converts UI JSON strings without writing nonexistent columns. Owner checkout settings and public safe rates RPC use these fields. |
| Staff | `user_id`, `user_email`, `user_name`, `role` | Membership lookup uses user ID, not a nonexistent active flag. Staff dashboard access remains explicitly unsupported. |
| Inventory | numeric `quantity_on_hand` and `low_stock_threshold`; `product_service_id` | Supports fractional quantities, links to the real menu table and uses transactional stock movements. |

The diagram was cropped, so unspecified column defaults/constraints were not inferred as verified facts. `audit/schema-observations.json` records only observed column names/value types; `audit/schema-column-checks.json` records zero-row column probes. Neither contains customer contact values or credentials. Database tests begin with the known column shapes in `tests/fixtures/restaurant-schema.sql`; this is not a claim to reproduce every hosted constraint or trigger.

## Behavior corrected

- Partial updates preserve unspecified fields. Authentication retains the earlier fixes for refresh concurrency, rejected versus transient refresh failures, server-controlled roles, confirmation callbacks, recovery and logout.
- Owner and public catalog queries now use the canonical tables or safe public projections. Anonymous users receive published business/menu/location fields, without recipes, owner IDs, barcodes or provider configuration.
- Owner-scoped RLS and related-record validation enforce tenant isolation. Order-item ownership uses the order relationship. Suppliers and purchase orders are also secured when those existing tables are present.
- Public orders validate branches, item/category availability, currency, quantities, delivery address and server prices. Checkout totals include configured service charge and tax, and the confirmation uses the returned server amount.
- Recipe stock is deducted once at completion and restored from recorded movements when the order status is cancelled/refunded. Later recipe edits do not alter existing snapshots. Shortages roll back the entire update. Deducted order lines cannot be materially edited or moved. Legacy stock flags without movement history are not silently reversed.
- Payment flags, partial/manual payments and payment records reconcile transactionally. Loyalty ledger changes update balances atomically. Customer lifetime-spend updates refresh both customers when an order is reassigned.
- Public and owner booking time inputs use the restaurant timezone. Impossible dates and nonexistent daylight saving times are rejected. Owner forms record table labels and report failed saves.
- Business loading, settings saves, uploads, product/category/customer/booking/loyalty/campaign saves and payment-method configuration have clearer failure handling. Copying a storefront link does not submit the settings form.
- Fractional inventory inputs, mobile editing controls, publication control, opening-hour lookup and report pagination are corrected. Unsupported online gateway configuration cannot accept secrets or be enabled.

## Test evidence

- **46 automated tests pass:** `audit/schema-tests-current.txt`.
- **TypeScript and ESLint pass:** `audit/schema-types.txt`, `audit/schema-lint.txt` are empty on success.
- **Production build passes:** `audit/schema-build.txt`. The large JavaScript bundle and stale Browserslist data remain non-failing warnings.
- Database tests execute the complete migration repeatedly against the existing column shapes and seeded data, verify unknown legacy-policy removal, preserve/import legacy catalog rows, exercise RLS under multiple identities, validate totals and transaction rollback, verify stock idempotence/restoration, freeze deducted order lines and refuse competing legacy triggers.
- Authentication/data tests cover canonical payload mappings, partial updates, pagination, provider mapping, session refresh, logout, confirmation and error handling.
- Time tests cover restaurant-local input/display, Dubai, London seasonal offsets, daylight saving gaps, invalid calendar dates and checkout rounding.
- Browser tests use synthetic responses that reject obsolete tables and key payload fields. They cover protected routes, rejected/successful login, signup mismatch/confirmation/resend, recovery/logout, all ten dashboard pages, owner booking/timezone/table label, menu creation with recipe, fractional inventory, checkout settings, safe copy-link behavior, public checkout tax/service display, ordering, reservations and mobile layouts. No uncaught browser exceptions occurred. Results: `audit/schema-browser.txt`; screenshots: `audit-screenshots/`.

The browser tests deliberately do not create live accounts or place real orders. The PostgreSQL tests simulate Supabase Auth functions; they do not certify the hosted service or unknown installed triggers.

## Live verification and required deployment work

`npm run check:database` is a repeatable read-only deployment check. Current result: **fails**, recorded in `audit/live-schema-status.txt`.

- Four public views return HTTP 404 because the migration has not been installed.
- Anonymous requests return row IDs from customers, orders, order items, bookings, inventory, settings and memberships. Direct raw catalog/business reads also remain enabled.
- Payments and loyalty tables return successful empty responses; that is inconclusive, not evidence of permission isolation.
- The project enables email signup and confirmation. Google, Microsoft/Azure and Apple provider settings were disabled during the earlier live settings check. Provider availability is fetched dynamically by the app.

Deployment requires administrator execution of the preflight and migration, reconciliation of any reported legacy triggers/data conflicts, deployment of this frontend, then a passing `check:database` and authenticated tests with real owner accounts. Existing ownership IDs must match Supabase Auth users; no automatic ownership transfer is performed. The migration does not fabricate historical payments or retroactively guess prior stock deductions.

## Remaining limits

This is not a claim that every possible restaurant feature works perfectly. Real email delivery, real hosted authentication/writes, hosted legacy constraints/triggers and post-migration permissions are unverified. Reservations remain requests; automatic table capacity, opening-hour enforcement and table allocation are not implemented. Anonymous public writes have no application CAPTCHA/rate limiter. Online card processing, staff dashboard permissions, campaign dispatch, live AI, restaurant storefront translation, variant/modifier selection and delivery-zone fees are not implemented. Those existing data fields are preserved, not advertised as completed integrations. Other verticals and legacy Base44 server functions were not expanded by this work.
