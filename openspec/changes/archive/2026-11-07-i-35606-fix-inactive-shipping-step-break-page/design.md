# Design

## Context

See `proposal.md` for the failure. The theme Checkout page derives `availableSteps` from the cart's `isVirtualCart` getter, but its `activeSection` state comes from the core Checkout mixin. The mixin's `activateSection()` already updates that state and the browser hash. `currentStep` can be `-1` during a mismatch, and `isReviewStep` currently indexes the step array without checking that index. The cart storage listener already commits replacement items, so the correction belongs in Checkout rather than cart synchronization.

Two mixin behaviors matter for navigation. `activateHashSection()` runs on every route change and activates any known section key found in the hash, without checking whether the theme offers that step. `activateSection()` assigns `origin + pathname + '#' + section` to `window.location.href`, outside Vue Router. That drops the query string, so on a URL such as `/checkout/onepage/?utm_source=review` the assignment is a document navigation rather than a fragment change, and the mixin's SSR `asyncData` redirects document requests for Checkout to the cart.

## Goals / Non-Goals

**Goals:**

- Return to Contact on either cart-virtuality transition, using the existing section activation path so the hash stays aligned and the customer encounters any newly required steps.
- Keep rendering safe during the reactive interval before reconciliation completes.
- Never activate an unavailable step from the URL hash, including one restored by browser history.
- Keep section activation an in-page fragment change for checkout URLs with query parameters.
- Verify the visible items and navigation in both cross-tab cart transitions, and that Checkout can continue afterwards.

**Non-Goals:**

- Change how cart storage events load products or how checkout forms validate their data.
- Alter checkout form validation or clear previously entered contact, shipping, or payment values.
- Validate whether a hash-requested available step has its prerequisites completed.

## Decisions

### Reconcile on cart virtuality in the theme Checkout page

Watch `isVirtualCart` in `Checkout.vue`. On either change, call the inherited `activateSection('personalDetails')` regardless of the previously active step. The established method updates both active section and URL hash. A customer whose cart gains a physical item then moves from Contact through the newly required Shipping step in the normal checkout flow. Considered redirecting only when Shipping disappears or returning directly to Shipping when it appears, but the same Contact reset for both transitions gives a consistent review point. Watch virtuality instead of every cart item update so cart changes that do not alter the step flow do not reset progress.

### Guard Review-step lookup independently

Make `isReviewStep` return false when `currentStep` has no matching entry in `availableSteps`. This keeps the page renderable while Vue processes the cart change and watcher. Considered relying on the watcher alone, but the computed property can run while the active section is stale and must be safe on its own.

### Reject unavailable hash sections in the theme

The theme already overrides `activateHashSection()`. Extend it so a hash naming a section that is not in `availableSteps` activates Contact instead of delegating to the mixin. Contact is always available and matches the virtuality reset point. Activate it with history replacement: the stale entry becomes `#personalDetails`, so pressing Back again continues to earlier history instead of returning to the same stale entry and being pushed forward again. Considered keeping the currently active step, but Contact keeps one predictable recovery point. Considered fixing this only in the mixin, but step availability is a theme concept.

### Navigate sections through Vue Router in core section activation

Change the mixin's `activateSection()` to update the hash with Vue Router instead of assigning `window.location`: push, or replace when the caller asks to replace the current history entry, a location built from the current route's path and query with the section hash. This fixes every step transition, not only the virtuality reset, because they all share the method. Router navigation never requests a document, so a URL mismatch cannot reach the SSR redirect, and the existing `$route` watcher still runs. Skip navigation when the route already has the section hash, because Vue Router rejects duplicate navigations, and pass the query explicitly because a hash-only location drops it. Pass an `onAbort` callback rather than relying on a returned promise: the app's `push` wrapper in `core/helpers/router.ts` always uses callback mode and returns nothing. The hash handlers read `$route.hash` instead of `window.location.hash`. Considered keeping `window.location` and only adding the query string, but any other URL difference would still turn a hash change into a document request. Considered overriding the method only in the theme, but the defect is in shared core code.

### Identify Contact in the URL when Checkout opens

Checkout starts on Contact, but the hash changed only when a section was activated later, so a fresh entry had no hash and a hash restored by entering through history was not synced. In the mixin's `beforeMount`, outside the success page, activate Contact with history replacement. The entry gets `#personalDetails` without an extra Back step. Considered syncing to the entry hash instead, but a later step's prerequisites may be missing on entry.

### Remove a redirected section hash on the cart page

SSR redirects every Checkout document request to the cart, and browsers keep the fragment across redirects, so reloading `/checkout/onepage/#shipping` shows `/checkout/cart/#shipping`. The server never sees the fragment, so the client removes it. A checkout module composable, `useRedirectedSectionHashRemoval()`, replaces the route without the hash on mount when the hash names a Checkout section, and the theme cart page calls it from `setup()`. Considered a `router.onReady` hook in the checkout module, but it runs before theme routes are registered, and its replace was redirected to the error page. Considered a global router guard, but it would also strip legitimate section-like anchors on other pages.

### Exercise real cross-tab synchronization in regression coverage

Extend the theme's Playwright Checkout tests with two pages in one browser context, using one to change the cart while the other remains on Checkout. Assert the new cart item display, step availability, active step, and hash after physical-to-virtual and virtual-to-physical changes, then continue from Contact to the next available step. Cover the entry hash, the cart URL after reloading Checkout, Back navigation after the physical-to-virtual change, and a client-side checkout URL with a query string, asserting that the query survives and that no document request occurs. A focused component test can cover the transient unmatched-step guard if the browser test cannot reliably observe the intermediate render. Considered testing only the watcher with mocked getters, but that would not demonstrate that the visible cart recovers after a storage event.

## Risks / Trade-offs

- A hash change through the core mixin's `activateSection()` triggers the existing route watcher. The resulting route activation should be idempotent because Contact is already active; verify this in both browser regressions.
- Resetting to Contact interrupts the current checkout step, including Payment or Review. This is intentional for a virtuality change; cart updates that preserve virtuality leave the active step alone.
- Replacing the stale history entry means forward history from that point is unchanged but the restored `#shipping` entry is lost. This is acceptable because Shipping is unavailable.
- Changing the core mixin affects every theme using it. Section hashes and history entries stay the same, but they are now created by Vue Router, so route guards and `scrollBehavior` run directly rather than through the browser's `popstate`. `scrollBehavior` targets `to.hash`; no element uses a section key as its id, so it does not scroll.
- Real cross-tab tests depend on shared browser storage and asynchronous cart updates. Wait on observable cart and step state rather than a fixed delay.
