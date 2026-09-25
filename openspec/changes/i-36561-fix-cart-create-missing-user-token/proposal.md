# Proposal

## Why

When pulling an existing cart fails with a response other than 200 or 404, the storefront currently starts guest cart creation. For an authenticated customer, that fallback omits the customer token and can replace the stored cart reference even though the pull failure does not establish that the customer has no active quote.

## What Changes

- Stop creating or connecting a replacement cart in response to an unsuccessful pull other than 404.
- Preserve the existing cart token and local items after such failures, and leave synchronization eligible for a later attempt without an additional cart lookup.
- Keep successful pull reconciliation and the existing 404 recovery behavior.
- Apply the same failure handling to authenticated and guest carts without making a cart-create request.

## Capabilities

### New Capabilities

- `cart-synchronization-recovery`: Defines how cart synchronization responds to successful pulls, missing carts, and other pull failures.

### Modified Capabilities

None.

## Impact

- Cart Vuex synchronization action under `core/modules/cart/`.
- No Magento or Vue Storefront API change, notification behavior, configuration change, dependency, or persisted-state migration is required. Reconciling a stored numeric quote ID after an external cart change is outside this pull-failure fix.
