# Proposal

## Why

Global touch sent flags suppress attribution for replacement carts, and rapid initial-page captures can overwrite useful Last Touch data. Issue #37236 corrects these client-side delivery and capture defects while preserving Magento's classification ownership and the existing cart-event transport.

## What Changes

- Replace each touch's global sent flag with its delivered cart id, including legacy normalization, touch-identity protection and cart-specific in-flight coalescing.
- Require successful First Touch delivery before a distinct Last Touch; its success mark makes Last Touch pending for that cart so ordered restoration remains retryable.
- Stop before the next request when the active cart changes, keeping successful results recorded for the request's cart and using the existing one-argument TaskQueue facade without core changes.
- Add configurable Last Touch replacement cooldown, identical-capture suppression and rejection of older cross-tab imports.
- Extend module unit coverage and document configuration and delivery behavior while retaining existing compatibility regressions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `traffic-attribution-capture`: Correct cart-specific delivery, ordered retries, stored-touch metadata and initial-capture replacement behavior; reconcile existing AppLovin, Maestra and stored-reuse requirements with that shared contract.

## Impact

Implementation is confined to `src/modules/traffic-attribution/` (existing actions, mutations, helpers, types, unit tests and README) and the `trafficAttribution` block in `config/local.json.template`. No dependency or API contract change is needed; requests keep the existing raw-touch body. Main specs will receive the delta only during later spec synchronization.

No changes to `core/`, Magento, the API adapter, themes, payment, database or SSR behavior are planned. Classification, GA4 alignment, expiry redesign, historical backfills, unrelated attribution discrepancies and #37184 remain outside scope. This proposal authorizes planning only.
