# Design

## Context

See `proposal.md` for the motivation and `specs/cart-synchronization-recovery/spec.md` for the behavior contract. `cart/sync` serializes calls and delegates reconciliation to `performSync`. That action currently handles 200 by merging items and 404 by clearing the previous connection. For every other returned code it increments a bypass counter and calls `connect` with `guestCart: true`. `CartService.getCartToken(true)` removes the user token placeholder from the cart-create URL, while a successful `connect` replaces the stored cart token.

For an authenticated customer with a numeric cart ID, the API adapter sends pull, item update, shipping information, and normal order requests to Magento's `/carts/mine` routes. Magento resolves the current active customer quote for those routes rather than using the supplied numeric ID. An authenticated pull returning 404 therefore indicates that Magento could not find an active customer quote; a failed pull with another status does not show that the stored ID is stale. An active quote can still fail item retrieval, including when a Budsies cart-item plugin throws. Authenticated cart creation returns an existing active quote ID when one exists, so it cannot repair that item retrieval failure.

`TaskQueue` already handles user-token refresh for 401 responses when configured. Its network failures reject; its API errors generally return a result code. The configured bypass limit is one by default. The current failure path also commits the current item hash, and `performSync` records a sync timestamp before the pull, which can make a failed pull look synchronized to later eligibility checks. `CartService.getItems()` is silent, and the existing failure branch resolves with an empty diff log; this change does not add customer notifications or a new action result.

## Goals / Non-Goals

**Goals:**

- Keep a failed pull from changing the connected cart or launching another cart-create request.
- Keep failed attempts distinguishable from completed synchronization so later eligible sync calls can retry through the current customer context or guest cart reference.
- Preserve serialized sync, pending-coupon transaction ordering, 200 reconciliation, and 404 recovery.

**Non-Goals:**

- Add an automatic timed retry, `GET /V1/carts/mine` lookup after failure, canonical quote-ID rebinding, or change the Cart API or `TaskQueue` token refresh.
- Add customer notifications, a new error return contract, or production telemetry.
- Change the separate 401 fallback inside `cart/connect`; this proposal concerns recovery after a pull of an already connected cart.

## Decisions

### Remove cart creation from unsuccessful pull handling

For any returned code other than 200 or 404, `performSync` will follow its existing failure completion path without dispatching `connect` or mutating the cart token or items. A 500, 403, or unresolved 401 means the pull failed; none proves the quote is gone. The existing 404 branch remains the missing-cart recovery path.

Alternative considered: derive `guestCart` from the current user token. This prevents an authenticated request from being sent to the guest endpoint, but `POST /carts/mine` reuses an active customer quote and creates one only if none exists. It cannot repair an active quote whose item pull fails, and it still makes a creation request on errors that do not establish cart absence.

### Leave failed attempts eligible for later synchronization

Remove the failure-path commit that sets the cart item hash to its current value. Record the last-sync timestamp only after a successful pull and reconciliation, rather than before the request. This lets the existing `isSyncRequired` checks continue to request a pull when the cart has not successfully synchronized. A forced sync can still retry when the caller explicitly requires it. No immediate loop or timer is added.

Alternative considered: retry the same pull immediately with a bounded attempt count. `TaskQueue` already owns token refresh, and an immediate repeat offers no clear recovery for 403 or 500 while adding API load. The next normal or forced sync is the retry point.

### Do not probe or rebind the customer quote ID on pull failure

Do not add a `GET /V1/carts/mine` request to this failure branch. A 200 response would confirm that an active quote exists and return its ID, but would not explain or repair a failing item-list request. A 404 pull already uses the existing initialization flow; a stale numeric ID alone will not cause `/carts/mine/items` to fail because Magento ignores that ID when selecting the authenticated quote.

The stored numeric ID can become stale if another flow changes the active quote during the same session. Most standard authenticated cart and order routes still resolve the active quote, while some custom endpoints use the literal ID. A successful item pull can expose a quote ID through returned items, but an empty cart has no item from which to read it. Reliable canonical-ID rebinding for ID-sensitive flows is a separate change, not a prerequisite for removing the unsafe pull fallback.

### Keep missing-cart recovery distinct

Leave the 404 branch and its `clear`/disconnect flow intact. For an authenticated customer, `/carts/mine/items` returning 404 means Magento could not resolve an active customer quote; for a guest, it means the requested guest cart could not be pulled. That path can initialize a cart through the existing session-aware flow and must not be generalized to other response codes.

## Risks / Trade-offs

- [A transient pull error leaves the current cart unsynchronized until another eligible sync] → Preserve the existing cart and allow the next normal or forced sync to retry it; do not claim success by updating the hash or timestamp.
- [An active quote has a persistent item-list error] → Retain its connection; creating a customer cart would return the same active quote and cannot repair the item-list failure. This change does not classify the error as temporary or permanent.
- [Callers observe the existing empty diff log after an API error] → Keep that action return contract in this focused change; no new customer notification is introduced.
- [A stale numeric customer ID can affect custom endpoints that resolve the literal ID] → Keep canonical-ID reconciliation outside this pull-failure fix; Magento's authenticated `/carts/mine` requests use the active quote regardless of the numeric ID.
- [A distinct `connect` 401 fallback can still create a guest cart during initial connection] → Keep its behavior explicit and outside this pull-recovery change; assess it separately if that path is observed to fail.

## Migration Plan

Deploy the storefront action. No data or API migration is needed. Rollback restores the previous client behavior without changing persisted cart format.
