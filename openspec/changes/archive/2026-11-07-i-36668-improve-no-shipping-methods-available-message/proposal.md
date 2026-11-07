## Why

The shipping-method section can look empty while methods are loading, after a lookup fails, or when the address has no available methods. Customers need clear feedback for each of these states.

Review also found that shipping-method lookups can use an outdated stored address instead of the address displayed in the form, that overlapping lookups can replace a newer result with an older one, and that checkout advances to payment before the lookup for the submitted address completes. A customer can therefore leave the shipping step without a valid shipping method for the current address.

A follow-up review found two remaining paths to an order without a valid shipping method. On the order-review step, applying a coupon starts a shipping-method lookup; when it fails or returns no methods, the selected method is cleared, yet the place-order controls become enabled again once totals finish syncing. On the shipping step, the address fields remain editable while the final lookup is pending, so checkout can advance with an address other than the one that lookup checked.

## What Changes

- Show a visible loading indicator while shipping methods are synchronizing.
- Expose a shipping-method synchronization-error flag, clear stale shipping methods and selection after a failed lookup, show `Error while loading shipping methods`, and let customers retry that lookup in place.
- Show `No shipping methods are available for this address.` only when synchronization is not loading or failed and the method list is empty.
- Disable Continue to payment while shipping-method synchronization has failed.
- Preserve the existing rendering of available shipping methods.
- Make every shipping-method lookup started from the shipping step (country change, ZIP/postcode change, Retry, Continue) use the address currently displayed in the shipping form, for guest and signed-in checkout.
- Let only the most recently started lookup control the displayed methods, selection, error, and loading state.
- Make Continue to payment wait for the lookup for the submitted address and advance only when it succeeds and the selected shipping method is still available.
- Lock the shipping address fields and the default-address option while Continue waits for the final lookup, and advance only when the displayed address still matches the address that lookup checked.
- Abandon a pending Continue submission when the customer leaves the shipping step, so it cannot write its address, start a lookup, or advance checkout afterwards.
- On the order-review step of a physical cart, disable the place-order button and the PayPal button while a shipping-method lookup is pending, after it fails, or when the selected shipping method is not among the available methods; explain the problem with a link back to the shipping step, and refuse order placement in that state. Virtual carts keep their current behavior.
- Add regression unit coverage for successful, empty, failed, retried, and overlapping lookups, for the Continue-to-payment guard including address changes during the final lookup, and for the order-review guard.

## Capabilities

### New Capabilities

- `checkout-shipping-method-availability`: Defines the loading, error, empty, and available states displayed by the checkout shipping-method section, the address and ordering rules for shipping-method lookups, the shipping-method guard on Continue to payment, and the shipping-method guard on order placement.

### Modified Capabilities

None.

## Impact

- Affects the cart shipping-method synchronization action: error flag, invalidation after failure, and ordering of overlapping lookups.
- Affects `o-shipping` and its translations: compact Retry control, synchronization of the displayed address before lookups, address locking during the final lookup, and the Continue-to-payment flow.
- Affects `o-confirm-order` and its translations: the place-order button, payment-method controls that consume its disabled state (including the PayPal button), order placement, and a shipping-method notice with an Edit shipping action.
- Adds unit tests for the cart action, `o-shipping`, and `o-confirm-order`.
- Does not change backend APIs, virtual-cart checkout, or express checkout flows.
