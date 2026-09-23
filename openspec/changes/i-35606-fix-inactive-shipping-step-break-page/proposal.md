# Proposal

## Why

When another tab replaces the cart with virtual-only items during Checkout's Shipping step, Shipping disappears from the available steps but remains active. The resulting invalid step index causes rendering to fail, leaving stale cart items visible even though synchronization updated the cart.

## What Changes

- Keep the active Checkout section within the available steps when cart virtuality changes.
- Return to Contact and update the URL hash whenever the cart changes between virtual-only and non-virtual contents, so newly required checkout details can be reviewed.
- Prevent the Review-step check from dereferencing an unavailable step.
- Add regression coverage for both cart-virtuality transitions, including visible synchronized cart items and a valid active step.

## Capabilities

### New Capabilities

- `checkout-step-availability`: Checkout navigation and cart rendering remain consistent when cart contents change across tabs.

### Modified Capabilities

None.

## Impact

- Checkout page step selection and Review-step rendering in `src/themes/petsies-capybara/pages/Checkout.vue`.
- Checkout regression coverage in the theme's existing Playwright suite, with focused component coverage where useful.
- No cart synchronization, API, or dependency changes are expected.
