# Tasks

## 1. Checkout step state

- [x] 1.1 Watch `isVirtualCart` in the theme Checkout page and activate Contact through the existing section method on either virtuality change; verify the active step and `#personalDetails` hash after both transitions.
- [x] 1.2 Guard `isReviewStep` when `currentStep` has no matching available step; verify a transient unmatched step does not throw or prevent Checkout from rendering.
- [x] 1.3 Make the core mixin's `activateSection()` navigate with Vue Router, keeping the current path and query, skipping an unchanged hash, and supporting replacement of the current history entry; read `$route.hash` in the hash handlers; verify every step transition still saves its details and order placement succeeds.
- [x] 1.4 In the theme's `activateHashSection()` override, activate Contact with history replacement when the hash names a step absent from `availableSteps`; verify Back to a stale `#shipping` hash keeps a valid active step.
- [x] 1.5 Activate Contact with history replacement when Checkout mounts outside the success page; verify a fresh entry has the `#personalDetails` hash and Back returns to the cart.
- [x] 1.6 Add a checkout module composable that removes a Checkout section hash on mount, and call it from the theme cart page; verify reloading Checkout lands on the cart without a hash and unrelated hashes are kept.

## 2. Cross-tab regression coverage

- [x] 2.1 Add a Playwright test that changes a physical cart to virtual-only items in another tab while Checkout is on Shipping; verify the synchronized virtual items render, Shipping is absent, Contact is active, and the hash is `#personalDetails`.
- [x] 2.2 Add a Playwright test that changes a virtual-only cart to one with a physical item in another tab while Checkout is on Payment; verify the synchronized items render, Shipping is present, Contact becomes active, and the hash is `#personalDetails`.
- [x] 2.3 Extend both transition tests to submit Contact afterwards and verify Checkout advances to the next available step.
- [x] 2.4 Add a Playwright test that presses Back after the physical-to-virtual transition; verify Shipping stays hidden, Contact stays active with the `#personalDetails` hash, and Checkout advances to Billing.
- [x] 2.5 Add a Playwright test that opens Checkout through client-side navigation with a query string and changes cart virtuality in another tab; verify the query string is kept, no document request is made, and Checkout stays open on Contact.
- [x] 2.6 Add a Playwright test that verifies the `#personalDetails` hash on entry, that Back returns to the cart, and that reloading Checkout on Shipping lands on the cart without a hash.
- [x] 2.7 Run the Checkout Playwright suite against the local storefront.
