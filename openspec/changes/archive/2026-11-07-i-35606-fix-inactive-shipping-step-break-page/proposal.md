# Proposal

## Why

When another tab replaces the cart with virtual-only items during Checkout's Shipping step, Shipping disappears from the available steps but remains active. The resulting invalid step index causes rendering to fail, leaving stale cart items visible even though synchronization updated the cart.

Review of the first fix found two further ways to leave Checkout unusable. Browser Back can restore a stale `#shipping` hash after Shipping became unavailable, and the hash handler activates it, so the step index is `-1` again. Section activation also rebuilds the URL without its query string, so on a checkout URL with query parameters the hash update becomes a document request that the checkout SSR handler redirects to the cart.

## What Changes

- Keep the active Checkout section within the available steps when cart virtuality changes.
- Return to Contact and update the URL hash whenever the cart changes between virtual-only and non-virtual contents, so newly required checkout details can be reviewed.
- Prevent the Review-step check from dereferencing an unavailable step.
- Ignore a URL hash that names an unavailable step, for example after browser Back: activate Contact and replace that history entry instead of adding one.
- Preserve the query string when section activation updates the hash, so the update stays an in-page fragment navigation.
- Identify Contact in the URL hash when Checkout opens, without adding a history entry.
- Remove a Checkout section hash that the browser carries onto the cart after the SSR redirect, for example on reload.
- Add regression coverage for both cart-virtuality transitions, including visible synchronized cart items, a valid active step, and continued checkout progress; for Back navigation to an unavailable step; and for query preservation.

## Capabilities

### New Capabilities

- `checkout-step-availability`: Checkout navigation and cart rendering remain consistent when cart contents change across tabs.

### Modified Capabilities

None.

## Impact

- Checkout page step selection, hash handling, and Review-step rendering in `src/themes/petsies-capybara/pages/Checkout.vue`.
- Section activation URL handling in the core Checkout mixin (`core/pages/Checkout.js`), shared by every step transition.
- A core checkout module composable, used by the theme cart page (`src/themes/petsies-capybara/pages/DetailedCart.vue`), that removes a redirected section hash.
- Checkout regression coverage in the theme's existing Playwright suite, with focused component coverage where useful.
- No cart synchronization, API, or dependency changes are expected.
