# Tasks

All tasks are planned and unchecked. [design.md](./design.md) fixes the implementation, test doubles, fixture mechanics, and exact commands; no investigation tasks remain.

## 1. Shared display and focused regression suite

- [ ] 1.1 Update module `types/estimated-shipment.interface.ts` to optional `offer_expiration_date?: string | null` with the UTC API/legacy-cache comment. Update `composables/use-estimated-shipment.ts` with local `useI18n`, per-instance mounted readiness, missing/null/empty and exact date-only omission, and the specified native Intl formatter without `timeZone` or adapter changes. Add module `test/unit/composables/use-estimated-shipment.spec.ts` using the actual composable in the existing mount helper: fixed date/time oracles, default-locale selection, compact absent/legacy cases, one replacement/removal sequence, and retained translated message/shipment promises. Verify the focused UTC command passes and `03:59:59` remains `03:59`, never `04:00`.
- [ ] 1.2 In that same suite, add one UTC-only wiring smoke for each real consumer and one UTC-only setup-harness SSR/hydration test using the existing renderer pattern and exact doubles in the design. Verify server/pre-mount omission, no server deadline-formatting call or hydration warning, and mounted local text. Pass the UTC suite without duplicating the harness matrix per consumer.

## 2. Integration checks

- [ ] 2.1 Run the suite with the three separate en-US `TZ` commands in the design, then `yarn type-check` and scoped ESLint. Record outcomes. Verify fixed New York/Los Angeles/UTC date/time fields and a short timezone label; do not derive the date/time oracle from an equivalent formatter. Confirm changes attributable to this work are limited to the two production files, one test file, and change artifacts, preserving preexisting dirty files and submodule checkouts.
- [ ] 2.2 Perform the design's one local UTC browser smoke: install the specified update/pull response replacements, use the named cart/checkout fixture navigation, and verify the same `October 22, 2026, 3:59 AM` deadline in detailed cart and checkout summary. Record results; no repeated legacy/timezone matrix, new refresh, broad E2E, shipping-form progression, orders, or payments.

## Workflow follow-up

- Magento #37128 must deploy before the frontend release; deployment is outside this checklist.
- Start implementation only after a separate explicit apply request. Authoring or reviewing artifacts completes no implementation tasks.
