# Design

## Context

See `proposal.md` for motivation and scope. The task's final preparation and review decisions supersede its earlier implementation suggestions.

Observed ownership and constraints:

- `store/actions.ts` creates wrappers with `isSent`, restores them before initial capture, compares the entire raw payload including `detected_at`, and has one module-level reporting promise. Last Touch is attempted even after a non-200 First Touch response.
- `store/mutations.ts` marks whichever touch is current, with no request identity. `cache-handler.factory.ts` persists SET payloads and post-MARK state; `get-local-storage-items.function.ts` imports parsed events without comparing timestamps.
- `index.ts` registers the store during SSR but installs storage/capture/cart-event side effects only on the client. Capture runs once per document, reporting on `cart-created` and `cart-connected`; event payload shapes are not used by the report callback.
- `core/lib/sync/index.ts` exposes `TaskQueue.execute(task)` and synchronously reads the root cart getter. Only the internal executor in `core/lib/sync/task.ts` accepts a cart argument and substitutes it into the URL.
- The lead verified Magento's unique `(quote_id, touch_type)` rows: the first payload initializes both rows, subsequent payloads overwrite Last Touch, and ordered-quote updates fail. This plan relies on that supplied contract, without database access or Magento changes.

The main spec contains AppLovin/Maestra and credential-protection requirements, including wording that freezes sent flags. The archived #36653 baseline (not present as general requirements in the current main spec) also permits Last Touch after First Touch failure. The delta modifies the conflicting current requirements and adds shared delivery/capture requirements in the same capability; it does not modify archives or reconstruct their unrelated baseline.

## Goals / Non-Goals

**Goals:** Keep state ownership in synchronous Vuex mutations, persistence in the existing factories, and requests in the existing action/TaskQueue flow. Add only the metadata and guards needed by the acceptance criteria.

**Non-Goals:** No new module, service, transport, storage key, cross-tab protocol or lock manager. Scope exclusions are listed in the proposal.

## Decisions

### 1. Replace the boolean with a single delivered cart id

Use `TouchData.deliveredCartId?: string`, alongside existing timestamps and outside `attribution`. A touch is delivered to the current cart only when `deliveredCartId === cartId`. This records the latest successful cart with minimal client state.

Initialize new touches without a delivered cart id. Normalize wrappers at the existing SET mutations, the common intake for storage loading and storage events: drop `isSent`, preserve attribution/timestamps verbatim, and keep `deliveredCartId` only when it is a non-empty string; otherwise omit it. Legacy `isSent: true` or false without a valid id, and wrappers with neither field, are not delivered to any cart because the boolean cannot identify one. Keep this small normalization local to `mutations.ts`, shared by both SET mutations, without a migration or stored-attribution cleanup.

Keep `MARK_FIRST_TOUCH_SENT` and `MARK_LAST_TOUCH_SENT`, with a shared typed payload `{ createdAt: number, cartId: string }` in the existing touch types file. After matching `createdAt` against the current touch, set its `deliveredCartId`; a mismatching or missing touch is a no-op. This prevents an old response from marking a replacement touch. Use `Vue.set` and `Vue.delete` when adding/removing the optional property so Vue 2 observes these mutations. The First Touch mark's related Last Touch effect is specified in decision 3.

Persist normalized state on SET rather than the unnormalized payload, and persist the affected state after marks through the existing cache handler.

### 2. Bind each pass to the cart without changing core

At report entry, read `rootGetters['cart/getCartToken']` once as the pass cart id; an empty id exits before transport. Keep touch snapshots for this pass. Immediately before each `TaskQueue.execute(task)`, re-read that getter and compare it with the pass cart id, with no `await` between the read and invocation. On mismatch, exit the pass without another send or mark. The facade therefore reads the identical cart id synchronously, while every delivery mutation uses the pass cart id.

Record each successful response for the pass cart, subject to the touch-identity guard, even if the active cart changed while the request was pending: the request used the pass cart. Keep earlier and current marks. The pre-request comparison stops the next request, preventing a Last Touch intended for cart A from being sent to cart B; B's own lifecycle event starts its delivery.

Keep the placeholder URL, silent POST and `{ request: attribution }` body. Do not serialize wrappers or add cart metadata to attribution. The existing one-argument facade plus adjacent checks suffices; a second argument would be ignored, importing its internal executor would cross the public boundary, and extending core would exceed the final decision.

### 3. Make ordered delivery retryable

Send First Touch when its `deliveredCartId !== cartId`. First Touch failure leaves delivery metadata unchanged and ends the pass. Send Last Touch only when it is distinct from First Touch, its `deliveredCartId !== cartId`, and First Touch is delivered to that cart, either already or through this pass. Retain full `isSameTouchAttribution` comparison for First/Last delivery duplicate suppression, including `detected_at`.

After its identity guard succeeds, `MARK_FIRST_TOUCH_SENT` also clears the current Last Touch's `deliveredCartId` when it equals the marked cart. Magento has just overwritten that cart's last row with First Touch, so the prior Last Touch delivery is no longer valid. The cache handler persists both current touches after a First Touch mark; after a Last Touch mark it persists Last Touch. An obsolete First Touch mark changes neither touch.

The ordinary Last Touch eligibility check now restores it after First Touch success. After handling a First Touch response, continue to Last Touch only if the sent First Touch is still current by `createdAt`; if it was replaced or cleared, stop the pass so a stale snapshot cannot send or mark a different pair, leaving current touches for the next cart event. Failed restoration leaves only Last Touch pending for the next event. Keep the existing event-level error handling nonblocking and release the in-flight entry on non-200 or rejected requests, without adding a retry loop or timer.

### 4. Coalesce by cart id

Replace the single module-level promise with a `Map<string, Promise<void>>` in the existing actions file. Same-cart calls join that cart's in-flight work; a different cart can start its own pass while the old pass awaits a response. Delete only that cart's entry in `finally`, preventing completion of cart A from releasing cart B's in-flight protection. A single promise swallows cart B's event; a generic coordinator adds no needed behavior.

### 5. Guard capture at its existing boundary

Add `trafficAttribution.lastTouchReplacementCooldownSeconds: 30` to the shipped template. In `SYNCHRONIZE`, after unchanged restoration/expiry and first-creation logic, retain the acquisition gate, then compare capture identity, then apply cooldown before SET_LAST_TOUCH. Interpret a positive finite number (including a numeric configuration string) as seconds; absent, zero, negative or non-numeric values disable this guard. There is no runtime fallback to 30 when the key is absent, preserving existing installations' replacement timing unless configured.

Use `elapsed = Date.now() - currentLastTouch.createdAt`; suppress only when `0 <= elapsed < seconds * 1000`. Exactly N seconds and negative elapsed values are outside the window. A suppressed capture is dropped, does not change timestamps/expiry/delivery metadata, and does not schedule a later capture. Missing Last Touch allows an acquisition capture immediately. First-touch creation is independent of the cooldown. Anchoring to stored `createdAt` prevents reloads/suppressed captures from extending the window.

Add a small exported capture comparator beside `isSameTouchAttribution` in the existing route helper: compare the full normalized raw attribution with only `detected_at` omitted from identity. Landing URL, optional referrer and filtered query map still participate, with key-order independence. This suppresses the identical reload even outside cooldown without changing delivery equivalence; changing the existing comparator globally would alter First/Last request suppression.

Do not couple capture rejection to the report action: retained touches remain reportable for a new cart. Keep acquisition lists, classification and expiry unchanged, including Maestra's nonblank click gate and explicit configured-list authority. Existing regression tests cover the preserved privacy boundary specified in the delta.

### 6. Reject older storage events at import

For each parsed First/Last storage-event update, read the corresponding current touch and ignore the incoming update only when its `createdAt` is strictly lower. Equal timestamps remain importable so delivery marks for the same touch propagate; newer updates and updates with no current touch still use SET. Removal events retain existing CLEAR behavior. This prevents a delayed older event from rolling touch state backward without changing initial-load expiry or inventing conflict resolution.

Reuse the existing helper and shared synchronization factory. `navigator.locks` and tie-breaking are excluded: the reported rapid/delayed cases need a cooldown and a strict age check without a distributed coordination subsystem.

## Risks / Trade-offs

- [Cart A, then B, then A is used again] → Returning to A resends attribution. This is accepted because Magento creates no duplicate rows and ordered First-then-Last delivery restores the last row.
- [Two tabs start simultaneously or equal-age metadata updates race] → The age guard does not serialize them; no exactly-once cross-tab guarantee is claimed.
- [A genuine second acquisition occurs inside the configured interval] → It is intentionally dropped; tests distinguish paid and organic genuine visits outside the window from rapid duplicates/delayed updates.
- [A cart changes after transport has started] → Record the successful result for its request cart; the next pre-request comparison stops further delivery and the new cart's event proceeds independently.

## Migration Plan

Implement the module changes and template/docs together, then run the checks in `tasks.md`. Stored wrappers adopt the optional cart metadata on normal intake; no database work or storage sweep is needed. A later authorized rollout applies the shipped setting through the normal configuration process. A code rollback reads wrappers without `isSent` as unsent and can resend on cart events; it does not restore overwritten historical attribution.
