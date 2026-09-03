## Why

The shipping-method section can look empty while methods are loading, after a lookup fails, or when the address has no available methods. Customers need clear feedback for each of these states.

## What Changes

- Show a visible loading indicator while shipping methods are synchronizing.
- Expose a shipping-method synchronization-error flag and show `Error while loading shipping methods` when the lookup fails.
- Show `No shipping methods are available for this address.` only when synchronization is not loading or failed and the method list is empty.
- Preserve the existing rendering of available shipping methods.

## Capabilities

### New Capabilities

- `checkout-shipping-method-availability`: Defines the loading, error, empty, and available states displayed by the checkout shipping-method section.

### Modified Capabilities

None.

## Impact

- Affects the cart shipping-method synchronization state only to expose the error flag consumed by `o-shipping`.
- Affects `o-shipping` and its translations.
- Does not change shipping-method selection, checkout progression, order confirmation, backend APIs, or other checkout components.
