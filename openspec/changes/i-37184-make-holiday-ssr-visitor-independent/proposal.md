# Proposal

## Why

The approved #37184 requirements replace country-specific SSR first paint with visitor-independent HTML and browser-resolved Holiday delivery content. The archived implementation still varies cached output by country and immediately reconciles selections before asynchronous browser data is ready, so it needs a focused adaptation rather than a rewrite of archived history.

## What Changes

- Render the Holiday widget in the same neutral loading state during SSR and initial hydration for every visitor; resolve location and show applicable labels/options in the browser once its shipping-country read has completed or failed. If saved customer data cannot be read, use detected country or the US fallback and allow manual location change instead of indefinite loading.
- Preserve valid existing, restored and manually selected options. Do not default or reconcile Holiday selections while location or relevant saved customization data is pending; retain the existing Standard fallback for a genuinely invalid selection once ready.
- When a saved-draft result cannot distinguish an unreadable draft from absence, follow the normal absent-draft path and allow normal persistence. Accept that an unreadable draft may be overwritten; do not add storage-driver or read-status metadata checks to distinguish those cases.
- Replace country cache markers/variants with a single safely shared response per existing store/significant-query/A/B key. Remove country-only registration and unused variation machinery; retain a small conservative cookie-read/no-cache safeguard without introducing a new policy framework.
- Preserve the implemented clean-URL render boundary, per-request redirect query append, recorded application redirects, response ownership, safe caching, and cache invalidation.
- Add readiness/hydration and storage-fallback regression coverage, including valid-selection preservation and independence from unrelated sequential customer-data reads; adapt the existing synthetic cross-request suites. Make shared `getItem()` timeout callbacks independent per invocation at the existing 800 ms duration, preserving its returned promise contract and success/fallback semantics without duplicate loads; keep the archived change and current ticket status unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ssr-output-cache-isolation`: Replace country-specific first paint and registered variations with neutral, visitor-independent Holiday SSR and simple sharing; keep query/redirect isolation and existing safety boundaries.
- `production-time-option-presentation`: Make Holiday location browser-ready rather than an SSR default, and defer selection reconciliation until location and saved selections are ready.

## Impact

The implementation targets the Holiday location composable and timeline widget, the shipping-country read inside the existing persisted-customer-data synchronization boundary, relevant customization restoration/defaulting wiring, shared storage `getItem()` per-invocation timeout callbacks, and the existing output-cache helpers/configuration/tests. No new dependencies, delivery rules, product prices, public APIs or production operations are required. The current country-first-paint requirement is intentionally superseded by delta specs in this new active change; neither archived artifacts nor canonical specs are edited during proposal generation.
