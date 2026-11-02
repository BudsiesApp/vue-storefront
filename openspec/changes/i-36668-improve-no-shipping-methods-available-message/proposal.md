## Why

The shipping-method section can look empty while methods are loading, after a lookup fails, or when the address has no available methods. Customers need clear feedback for each of these states.

Review also found that shipping-method lookups can use an outdated stored address instead of the address displayed in the form, that overlapping lookups can replace a newer result with an older one, and that checkout advances to payment before the lookup for the submitted address completes. A customer can therefore leave the shipping step without a valid shipping method for the current address.

## What Changes

- Show a visible loading indicator while shipping methods are synchronizing.
- Expose a shipping-method synchronization-error flag, clear stale shipping methods and selection after a failed lookup, show `Error while loading shipping methods`, and let customers retry that lookup in place.
- Show `No shipping methods are available for this address.` only when synchronization is not loading or failed and the method list is empty.
- Disable Continue to payment while shipping-method synchronization has failed.
- Preserve the existing rendering of available shipping methods.
- Make every shipping-method lookup started from the shipping step (country change, ZIP/postcode change, Retry, Continue) use the address currently displayed in the shipping form, for guest and signed-in checkout.
- Let only the most recently started lookup control the displayed methods, selection, error, and loading state.
- Make Continue to payment wait for the lookup for the submitted address and advance only when it succeeds and the selected shipping method is still available.
- Add regression unit coverage for successful, empty, failed, retried, and overlapping lookups and for the Continue-to-payment guard.

## Capabilities

### New Capabilities

- `checkout-shipping-method-availability`: Defines the loading, error, empty, and available states displayed by the checkout shipping-method section, the address and ordering rules for shipping-method lookups, and the shipping-method guard on Continue to payment.

### Modified Capabilities

None.

## Impact

- Affects the cart shipping-method synchronization action: error flag, invalidation after failure, and ordering of overlapping lookups.
- Affects `o-shipping` and its translations: compact Retry control, synchronization of the displayed address before lookups, and the Continue-to-payment flow.
- Adds unit tests for the cart action and `o-shipping`.
- Does not change order confirmation or its place-order controls, backend APIs, virtual-cart checkout, or express checkout flows.
