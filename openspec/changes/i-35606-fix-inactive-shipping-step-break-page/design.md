# Design

## Context

See `proposal.md` for the failure. The theme Checkout page derives `availableSteps` from the cart's `isVirtualCart` getter, but its `activeSection` state comes from the core Checkout mixin. The mixin's `activateSection()` already updates that state and the browser hash. `currentStep` can be `-1` during a mismatch, and `isReviewStep` currently indexes the step array without checking that index. The cart storage listener already commits replacement items, so the correction belongs in Checkout rather than cart synchronization.

## Goals / Non-Goals

**Goals:**

- Return to Contact on either cart-virtuality transition, using the existing section activation path so the hash stays aligned and the customer encounters any newly required steps.
- Keep rendering safe during the reactive interval before reconciliation completes.
- Verify the visible items and navigation in both cross-tab cart transitions.

**Non-Goals:**

- Change how cart storage events load products or how checkout forms validate their data.
- Alter checkout form validation or clear previously entered contact, shipping, or payment values.

## Decisions

### Reconcile on cart virtuality in the theme Checkout page

Watch `isVirtualCart` in `Checkout.vue`. On either change, call the inherited `activateSection('personalDetails')` regardless of the previously active step. The established method updates both active section and URL hash. A customer whose cart gains a physical item then moves from Contact through the newly required Shipping step in the normal checkout flow. Considered redirecting only when Shipping disappears or returning directly to Shipping when it appears, but the same Contact reset for both transitions gives a consistent review point. Watch virtuality instead of every cart item update so cart changes that do not alter the step flow do not reset progress.

### Guard Review-step lookup independently

Make `isReviewStep` return false when `currentStep` has no matching entry in `availableSteps`. This keeps the page renderable while Vue processes the cart change and watcher. Considered relying on the watcher alone, but the computed property can run while the active section is stale and must be safe on its own.

### Exercise real cross-tab synchronization in regression coverage

Extend the theme's Playwright Checkout tests with two pages in one browser context, using one to change the cart while the other remains on Checkout. Assert the new cart item display, step availability, active step, and hash after physical-to-virtual and virtual-to-physical changes. A focused component test can cover the transient unmatched-step guard if the browser test cannot reliably observe the intermediate render. Considered testing only the watcher with mocked getters, but that would not demonstrate that the visible cart recovers after a storage event.

## Risks / Trade-offs

- A hash change through the core mixin's `activateSection()` triggers the existing route watcher. The resulting route activation should be idempotent because Contact is already active; verify this in both browser regressions.
- Resetting to Contact interrupts the current checkout step, including Payment or Review. This is intentional for a virtuality change; cart updates that preserve virtuality leave the active step alone.
- Real cross-tab tests depend on shared browser storage and asynchronous cart updates. Wait on observable cart and step state rather than a fixed delay.
