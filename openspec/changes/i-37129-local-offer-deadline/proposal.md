# Proposal

## Why

Redmine Error #37129 (Epic #37127, Budsies, sprint B137/551) fixes the cart deadline reported as October 20 instead of October 21. The stored cutoff is correct; interpreting a date-only string as UTC midnight loses the actual expiration instant ([Slack report](https://optimus.slack.com/archives/DPMFC689L/p1792526034465919)).

## What Changes

- Consume sibling Magento #37128's approved nullable `offer_expiration_date`: populated values are RFC 3339 UTC timestamps ending in `Z`, such as `2026-10-22T03:59:59Z`. Magento deploys first.
- Format that instant with native Intl in the browser's default locale and timezone, including year, month, day, hours, minutes, and a short timezone label, inside the existing translated `if you order by {date}` message. Omit seconds without rounding to the next minute.
- Keep both cart consumers on `useEstimatedShipment`. Omit deadline text during SSR and the initial client render; enable formatting after the owning component mounts.
- Omit missing/null deadlines and real legacy cached `YYYY-MM-DD` values. Let existing cart refreshes replace legacy data; never invent its missing cutoff time or migrate saved carts.

## Capabilities

### New Capabilities

- `cart-offer-deadline-presentation`: Shared browser-local offer cutoff display, initial-render behavior, and legacy saved-cart handling.

### Modified Capabilities

None. `production-time-option-presentation` owns production options and Magento shipment promises; `cart-recovery` owns promo-code recovery. Neither currently specifies expiration display. Existing `application-service-access` constraints apply without changes.

## Impact

- Root-owned implementation: `src/modules/customization-system/composables/use-estimated-shipment.ts` and `types/estimated-shipment.interface.ts` (relative to the same module). Use the existing `core/application-services` translation adapter; document `string | null` with the approved timestamp contract.
- One root-owned suite, `src/modules/customization-system/test/unit/composables/use-estimated-shipment.spec.ts`, will cover the actual composable through a setup harness, fixed timezone examples, null/legacy data, reactive replacement, one hydration case, and small wiring smoke tests for both consumers. No consumer template or theme changes are required.
- Shared behavior applies across brands. Preserve shipment promises and Magento eligibility. No timezone field, geolocation, picker, countdown, timers, new dependencies, or backend changes in this repository.
- Planning base: `petsies-theme` / `83b88c61a24fef6cb402451df86c1655caec25d0` (`origin/HEAD`), not upstream `main`. Preserve existing dirty files and nested checkouts.
