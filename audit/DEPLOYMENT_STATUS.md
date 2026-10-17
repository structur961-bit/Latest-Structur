# Restaurant database deployment

Verified 17 October 2026, project `cdkvojsruitrbgwkvgjt`.

## Applied migrations

| Version | Migration |
| --- | --- |
| 20261017082930 | add_optional_category_description |
| 20261017083436 | add_missing_restaurant_form_columns |
| 20261017084221 | align_restaurant_catalog_permissions_and_workflows |
| 20261017084406 | pin_restaurant_rate_validation_search_path |

The user explicitly approved applying the full migration before its execution.

## Passed checks

- Administrator SQL contract: 184 fields, 14 application tables, zero missing fields.
- All four required RPC signatures exist.
- All four public views respond HTTP 200.
- Anonymous reads of customers, orders, order items, bookings, inventory, settings, memberships, payments, loyalty, raw catalog and raw businesses respond HTTP 401.
- Public order RPC used server prices and returned 28.88 for a 25 subtotal, 5% service charge and 10% tax on subtotal plus service charge.
- Public reservation persisted pending; owner changed it to seated.
- Manual payment produced partial; owner RPC reconciled paid and refunded states.
- Canonical inventory product reference accepted; repeated completion deducted stock once; order refund restored stock.
- Loyalty ledger updated the customer's balance.
- Another authenticated identity could neither read the order nor update the menu price.
- Anonymous reads excluded an unpublished restaurant and denied customer access.
- All live test writes were rolled back; subsequent synthetic-business count was zero.
- All 54 local automated tests pass, including the hosted smoke SQL in disposable PostgreSQL.

`restaurant_live_smoke.sql` uses an existing Auth user ID for JWT-claim simulation with `SET LOCAL ROLE`; it does not create an account, authenticate a real browser session, send email or retain fake orders.

The read-only `check:database` command exits 0. Its private-column checks need an owner JWT, and the hosted OpenAPI endpoint denies discovery. Those checks are labeled UNVERIFIED in that command; administrator SQL supplied the separate column/RPC evidence above.

## Remaining advisor findings and limits

The security advisor is not clean. Four deliberately filtered public projection views are flagged as [security-definer views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view). Their explicit published/active predicates and selected columns provide the public boundary while raw-table anonymous grants are revoked. Tests verify those predicates and hidden private fields. Changing these views to security-invoker without redesigning the grants would break anonymous menu access. They require continued review whenever columns or predicates change.

The advisor flags eight anonymously callable and nine authenticated-callable definer functions. Checkout settings, public ordering and reservation RPCs are deliberately callable and validate their input. The owner-check helper deliberately supports owner RLS. Other findings concern pre-existing `can_access_business`, `handle_new_user`, `is_admin`, `is_business_member` and `order_is_public_writable` helpers. This deployment does not certify those legacy APIs as audited. See the [anonymous](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) advisor references. Direct client execution of internal restaurant processing trigger functions is revoked.

[Leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains disabled in Supabase Auth. Real email delivery and authenticated browser transactions remain unverified.

Historical orders with pre-migration stock flags and no movement history still require explicit reconciliation before reversal; historical stock is not guessed. External card processing, staff dashboards, automated campaign delivery, live AI, table allocation, menu variant/modifier selection and delivery-zone pricing remain outside the implemented restaurant flow.
