## Why

The shipping-method section can look empty while methods are loading, after a lookup fails, or when the address has no available methods. Customers need clear feedback for each of these states.

## What Changes

- Show a visible loading indicator while shipping methods are synchronizing.
- Expose a shipping-method synchronization-error flag, clear stale shipping methods and selection after a failed lookup, show `Error while loading shipping methods`, and let customers retry that lookup in place.
- Show `No shipping methods are available for this address.` only when synchronization is not loading or failed and the method list is empty.
- Disable Continue to payment while shipping-method synchronization has failed.
- Preserve the existing rendering of available shipping methods.

## Capabilities

### New Capabilities

- `checkout-shipping-method-availability`: Defines the loading, error, empty, and available states displayed by the checkout shipping-method section.

### Modified Capabilities

None.

## Impact

- Affects the cart shipping-method synchronization state to expose the error flag and invalidate unavailable shipping methods after a lookup failure.
- Affects `o-shipping` and its translations, including the compact Retry control and Continue-to-payment guard shown after a lookup failure.
- Does not change shipping-method selection, checkout progression, order confirmation, backend APIs, or other checkout components.
