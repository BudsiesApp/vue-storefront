# Tasks

## 1. Checkout step state

- [x] 1.1 Watch `isVirtualCart` in the theme Checkout page and activate Contact through the existing section method on either virtuality change; verify the active step and `#personalDetails` hash after both transitions.
- [x] 1.2 Guard `isReviewStep` when `currentStep` has no matching available step; verify a transient unmatched step does not throw or prevent Checkout from rendering.

## 2. Cross-tab regression coverage

- [x] 2.1 Add a Playwright test that changes a physical cart to virtual-only items in another tab while Checkout is on Shipping; verify the synchronized virtual items render, Shipping is absent, Contact is active, and the hash is `#personalDetails`.
- [x] 2.2 Add a Playwright test that changes a virtual-only cart to one with a physical item in another tab while Checkout is on Payment; verify the synchronized items render, Shipping is present, Contact becomes active, and the hash is `#personalDetails`.
