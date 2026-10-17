# Structur Restaurant — schema-aligned Supabase application

Updated 17 October 2026 for Supabase project `cdkvojsruitrbgwkvgjt`, using the supplied database diagram and live SQL inspection of columns, constraints and trigger definitions.

## Deployment status

The revised SQL has **not** been applied to the hosted database. Automatic approval review rejected the production migration pending explicit approval of its changes to shared tables, constraints, triggers, policies and grants. The latest read-only check still found anonymous access to private restaurant rows, and the new public views are not installed. The frontend and database migration must be deployed together.

## Database setup

1. Open the project's Supabase SQL Editor with administrator access.
2. Run `supabase/restaurant_preflight.sql`. It lists existing triggers, policies and column definitions, plus aggregate checks for conflicting settings, rates, recipes, currencies and ownership.
3. Run the complete `supabase/restaurant_setup.sql` in one query. It is transactional and rerunnable. It targets the existing tables and retains their data.
4. The migration detaches only the exact old stock trigger inspected in this project, after matching its function body hash. Other conflicting processing triggers still stop deployment and require inspection. Duplicate settings and barcode conflicts also require data reconciliation.
5. Run `npm run check:database`. It must pass before treating the hosted restaurant application as deployed and isolated.

The migration uses `categories`, `product_services`, `orders`, `order_items`, `business_settings`, and the other existing owner tables. It does not replace them with a separate menu catalog. Any rows in legacy `menu_categories`/`menu_items` tables are copied with their IDs into the canonical catalog, then anonymous/client access to the unused legacy tables is revoked. No source rows are deleted.

The migration adds the missing menu UI fields, delivery address, recipe snapshots, stock movements and public views. Existing orders keep their real IDs; the application derives a display reference from the order ID. Order items inherit ownership through `order_id` and do not require a `business_id` column. Payment-method settings are stored in the existing JSONB `payment_rules` field.

Live SQL inspection also found an inventory foreign key targeting `menu_items`, and CHECK constraints rejecting pending bookings, partial payments and refunded orders. The migration corrects that relationship after preserving the legacy catalog and extends the states while retaining open orders and seated bookings. Existing historic stock flags remain subject to reconciliation because no movement history exists for those deductions.

## Local application

```powershell
npm ci
npm run dev
```

The existing `.env.local` supplies the Supabase URL and public key. Only public/publishable keys belong in Vite environment files. Administrator credentials are not present in this project.

Supabase Auth handles registration, email confirmation, login, session refresh, logout and password recovery. Provider buttons are shown only when that provider is enabled. For local email redirects, allow the development origin in Supabase Authentication URL Configuration; the port shown by Vite must match that configuration.

The onboarding flow reuses an existing owned business or creates a new one. It does not automatically claim legacy businesses whose owner ID differs from the authenticated Supabase user.

## Restaurant behavior

- Categories and menu items use the existing catalog, including barcode scanning, active/featured flags and dietary tags.
- The owner can publish/unpublish the storefront and edit business details, timezone and opening hours.
- Restaurant checkout settings store `tax_rate_percent`, `service_charge_percent` and `receipt_footer_text`. Service charge is applied to subtotal; tax is applied to subtotal plus service charge. The server calculates final amounts and the confirmation displays the server total.
- Public menu routes are `/restaurant/YOUR-SLUG` and `/b/YOUR-SLUG`. Public views expose only published menu/business/location fields, not owner IDs, recipes or private payment configuration.
- Pickup/delivery orders use server prices, validate branch/item ownership and reject unavailable menu items. Inventory recipes are snapshotted with order lines.
- Completing an order deducts its recipe ingredients once. Repeated completion does not deduct again. Cancelling/refunding the order status restores the recorded stock movements. Financial payment refunds alone do not change the order's stock status. Insufficient stock rolls back completion. Legacy deductions without movement history require reconciliation before reversal.
- Recipes are arrays of `{ "inventory_item_id": "UUID", "quantity": 0.02 }`, with quantities measured in each inventory item's unit. Quantity-on-hand and stock thresholds support decimals.
- Reservation requests and owner booking edits interpret entered times in the restaurant's timezone. Requests remain pending for owner confirmation. Owner bookings can record `table_label`.
- Manual payments, partial payments and order payment-state changes remain consistent. Loyalty adjustments update the balance and ledger in the same transaction.
- Reports and dashboard lists paginate instead of silently stopping at the default backend row limit.

## Verification

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npm run check:database
```

Local tests run in a disposable PostgreSQL engine with simulated Supabase identities and do not alter hosted data. `check:database` is read-only and reports deployed schema/isolation failures. The workstation-specific `tests/browser-audit.mjs` uses the bundled Playwright runtime and Edge, synthetic API responses, and a local Vite server on port 5173.

See `audit/AUDIT_REPORT.md` for the final results, schema evidence and outstanding deployment limits.

## Product limits

Online card processing is unavailable and its configuration controls are disabled. Cash, bank transfer, custom offline settings and manual records are supported. Staff access, automated campaign sending, live AI responses, automatic table-capacity allocation, menu variant/modifier selection and delivery-zone pricing are not implemented in this restaurant flow. The storefront currently uses English; the dashboard supports English and Arabic. Custom-domain text is stored metadata, not DNS/hosting activation. Real email delivery and real authenticated hosted transactions remain unverified.
