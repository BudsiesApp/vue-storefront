# Design

## Context

See proposal.md for motivation and the two delta specs for the behavior contract. This is an adaptation on branch `37184-prevent-cross-visitors-cache-leakage`, not a replacement of `archive/2026-11-03-i-37184-prevent-cross-visitors-cache-leakage`. The approved issue description is the requirements source; historical task text is not authority to retain country-specific SSR.

Observed in the current checkout:

- `core/scripts/utils/page-cache-key.ts` splits clean render URLs from ignored query pairs; `ssr-response.ts` appends only the current request's stripped query when sending cached or fresh redirects. These protections already exist.
- `use-holiday-delivery-location.ts` evaluates persisted country, request cookie and US fallback immediately, including during SSR. The timeline widget uses that location to choose labels/options and has an immediate watcher that can emit Standard before browser data finishes loading.
- `persisted-customer-data/index.ts` dispatches the asynchronous `synchronize` action without awaiting it. The action reads shipping country after email/name/phone and commits it only after VAT/legacy-email reads; an unrelated delay or rejection can block country availability. An undefined country getter does not distinguish pending from absent/unreadable. There is no public readiness getter.
- `core/lib/store/storage.ts` already has an 800 ms `getItem()` callback fallback. Its timeout does not settle the returned promise, and rejection of the outer driver `ready()` can bypass its inner catch. Awaiting that promise alone, or marking only successful full synchronization ready, cannot guarantee the approved fallback. This change reuses the callback path and handles the same read's rejection, without modifying the general storage driver.
- `use-customization-state-preservation.ts` already tracks restoration internally through `canUpdateState`, but returns only storage methods. Forms also call the immediate `useCustomizationsOptionsDefaultValue()` watcher. Gating only the timeline watcher would not protect every relevant defaulting path.
- The only production `registerOutputCacheVariation()` caller is `customization-system/server.ts`, for `detected_country`. The country feature accounts for the registry, marker/variant entries and extra tag. Other observed request-service cookie consumers use the existing A/B cookie dimension.

## Goals / Non-Goals

**Goals:** Use explicit browser readiness at the existing data owners, preserve valid selections across asynchronous completion, and reduce output caching to safely shared responses plus existing store/query/A/B separation.

**Non-Goals:** No delivery eligibility or price changes; no new location service, cache plugin system, dependency scanner, automatic retry framework, global loading coordinator or general customization rewrite. Do not change the ignored-query policy, redirect destinations, supported query semantics, ticket status or archived files. This workflow makes planning artifacts only.

## Decisions

### 1. Keep Holiday SSR and the first browser render neutral

Update the existing `useHolidayDeliveryLocation()` rather than adding a parallel location abstraction. Expose unresolved location/readiness until both mounting and settlement of the browser shipping-country attempt permit resolution. Never read `detected_country` or choose a visitor location during SSR. Successful absence or an unreadable saved country permits detected-country/US fallback in the browser; failure must not leave loading indefinitely. Preserve any valid current selection and allow manual location changes after fallback. Normalize countries with the existing pure helper and retain manual override precedence.

Gate the Holiday widget's location selector, cards and location-dependent affordances behind readiness; show a small localized loading status with an appropriate busy/status announcement instead. The initial hydration tree remains neutral even if storage completed before mounting. Keep ordinary non-Holiday rendering unchanged. Shared API configuration can still include records for both locations in serialized state: it is visitor-selected content/state that must be absent, not public delivery configuration.

Rejected: US as a temporary displayed default (wrong content and premature selection changes), reading browser cookies during setup (hydration mismatch), and hiding only the label while still rendering actionable country-specific cards.

### 2. Settle the existing shipping-country read independently of unrelated fields

Use one minimal reactive shipping-country-settled flag/getter in `persisted-customer-data`, initially false for SSR/browser startup. Move the sole existing shipping-country read and its commit to the start of `synchronize`, before the unrelated sequential field reads. Publish its value, then settlement on success, absence or failure; do not wait for email/name/phone/VAT or legacy-email completion. Remove the old later country read/commit, reuse the storage handle, and retain the other fields' existing read/commit behavior. Catch storage acquisition/read failures at this owner and settle the flag so the composable can fall back; if module storage setup fails before dispatch, the same owner must expose settlement rather than blocking Holiday startup. Preserve existing diagnostic handling without logging saved values or swallowing unrelated field errors.

Make that one shipping-country `getItem()` call through a small action-local single-settlement promise: resolve from its existing callback, including the driver's timeout/local-cache fallback, and attach rejection handling to the returned promise. A synchronous throw also settles as unavailable. Commit only after the first accepted completion, so a late driver result cannot overwrite fallback/manual choices or trigger a second reconciliation. This is an adapter at the existing read, not another load, retry, timer or reusable storage framework. No global timeout change or direct browser-storage access is needed. Readiness means the attempt has settled, not that all customer data loaded successfully.

Expose a narrow read-only restoration-settled value from `useCustomizationStatePreservation()` at the existing owner, retaining stale-attempt/product-key guards. Where saved customization storage is unreadable, finish that attempt as unavailable without clearing valid current selections, merging partial data, removing saved data, or enabling a persistence write because of failure. Do not equate completion with the separate `canUpdateState` permission to persist. Reuse the sole existing saved-form read and the same existing callback/rejection completion behavior where its promise would otherwise strand readiness. For forms without saved restoration, no extra wait is needed. Pass the value through existing form → customization-option → widget props; no EventBus protocol or global readiness service is needed. Country fallback and the manual location control must not wait on unrelated fields or a failed saved-form read.

Rejected: whole-`synchronize` success as readiness (unrelated reads can block country), a new parallel/duplicate storage load (unnecessary), promise-only `finally` (does not settle the driver's hanging promise), readiness inferred from a nonempty country (never ready for first-time visitors), mount alone (storage is asynchronous), and a new retry/state-machine framework (not required by the approved fallback).

### 3. Reconcile only against a ready set of options

The Holiday timeline watcher must return without emitting while location, applicable restoration or required option data is pending. Once ready, preserve a valid value; choose Standard only for an actually empty/invalid ready value and only when Standard is available. Never derive invalidity from a temporary empty list. Location changes that leave the same Rush option valid update displayed terms without changing its underlying value; genuinely invalid options retain the existing Standard fallback.

Apply the same Holiday-specific readiness condition to relevant form defaulting, so the existing generic default watcher cannot overwrite selections while the timeline is gated. Inspect the concrete callers already identified: `form-with-images-gallery.vue`, `vertical-steps-form.vue`, `creation-wizard-form.vue`, `phrase-pillow-form.vue` and `alteration-product-form.vue`; change only their applicable Holiday defaulting/restoration wiring. Keep existing cart/initial-state restoration and non-Holiday defaults intact. Reuse settlement from the data owners rather than inventing a separate widget lifecycle. Preserve the current restoration guard against writing an intermediate replacement back to storage. Storage failure alone is never evidence that a current option is invalid: preserve it if valid for the resolved fallback location, and keep the established Standard rule only for a genuinely empty/invalid ready value.

Rejected: removing reconciliation entirely (breaks genuinely invalid selections), unconditionally selecting Standard on mount (loses upgrades), and changing all customization defaulting semantics (unrelated behavior).

### 4. Remove country variation machinery, retain the cheap conservative guard

Remove the country server registration and the registry/marker/variant functionality whose only production consumer it was. Simplify `output-cache.ts` and `output-cache-types.ts` to response entries under the existing encoded store/query/A/B key. Remove the country-only invalidation tag from `config/local.json.template`; retain page tags, `redirect`, wildcard invalidation, cache TTL and existing configuration flags. No new flags or dimensions are added.

Keep per-render cookie-name recording at the existing request-services boundary and classify non-A/B reads as `no-cache`, including absent/repeated reads and late hooks/template reads. Reuse the existing preparation boundary and warning deduplication; shrink the existing helper or inline the small check rather than building a new policy interface. This is inexpensive protection already wired and tested; it is not a claim to detect raw cookie access or prove all future SSR output safe. It prevents storing observed cookie-dependent output on fresh renders. The known Holiday path instead avoids visitor inputs entirely, so it remains cacheable.

Rejected: retaining an unused extensible registry or registering more speculative dimensions (no current consumers), bypassing caching for every cookie-bearing request (would discard safe sharing), and deleting all cookie-read protection (would remove a low-cost existing safety check for late or accidental reads).

### 5. Preserve the implemented query and response boundaries

Do not redesign `splitPageCacheUrl()`, `appendStrippedQuery()`, the single clean-URL navigation, route/previous-route serialization or recorded application redirects. Keep current destination query precedence, original encoding, repeated/blank ignored pairs, fragment handling and supported client query restoration. Router forwarding/inherited/explicit-query redirects and applicable URL-rewrite/other recorded paths remain covered. Also retain sent-response guards, detached cache-write failure logging and cleanup/error containment.

Adapt variation-specific fixture expectations rather than replacing the existing synthetic request harness or broadening implementation scope. Country-independent redirects still share; an unexpected non-A/B cookie read forbids caching rather than creating a variant. Keep current store/A/B key encoding even after removing country suffixes.

### 6. Verify the actual widget lifecycle and reuse cross-request tests

Extend `holiday-delivery-country.spec.ts` to exercise mounted readiness, delayed shipping data, successful absence, unreadable-country fallback to detected country/US, persisted-country precedence and manual override after fallback. At the action/storage boundary use deferred unrelated field reads to prove country success/failure settles first and each attempt issues one shipping-country read. Cover synchronous throws, rejected driver readiness, resolved-empty results, existing callback timeout while the returned promise remains pending, and late completion ignored after fallback. Use the existing timeout via fake timers/driver fixtures, not a fabricated promise timeout that production does not have.

Add a focused timeline-widget suite alongside the component, using the repository's Vue 2 SSR/hydration support: render neutral HTML, hydrate it with delayed browser data, then inspect content and emitted selection changes. Exercise saved Rush restoration before/after country completion, storage-failure/timeout completion, no intermediate Standard/persistence write, manual location change after fallback, later valid/invalid location changes, shared SKUs, regular mode and desktop/mobile markup. A saved-form failure releases only restoration settlement, not permission to overwrite unreadable saved state.

Replace country-variant expectations in `output-cache-country.spec.ts` with a neutral Holiday response miss/hit test that uses the actual widget render/composable path, not only a synthetic cookie-to-label function. Reuse the in-memory TTL/tag cache and all existing redirect, HTML-state, isolation and response-ownership suites. Assert the entire shared HTML/state is visitor-independent and contains no synthetic query values; public identical API delivery records are not a leak. Verify no Holiday SSR country-cookie read and one shared entry across cookie values. Keep unexpected-cookie tests as no-write controls, not fabricated successful hits.

## Risks / Trade-offs

- Holiday location content appears after browser readiness instead of first paint → This is the approved trade-off; keep a neutral accessible loading status with no false promises or clickable options.
- Mount can precede storage and saved-form restoration → Gate both relevant owners and test both completion orders with emitted-event and persistence spies.
- A storage failure or unrelated sequential field delay could strand Holiday loading → Settle the sole country attempt before unrelated reads, reuse the existing callback timeout and handle synchronous/async failures. Resolve detected country/US and expose manual change; do not add another timer or storage load.
- A late storage result or failed saved-form read could overwrite a valid current selection → Accept read completion once, keep stale-restoration guards, distinguish settled from persistence-writable, and test valid Rush preservation without failure-triggered writes.
- Browser-only gating could mask a parent default watcher → Gate the identified Holiday default paths, and verify selected values and storage through a real form restoration fixture.
- Existing tests encode the archived variant policy → Replace those expectations explicitly; preserve query/redirect, tags, no-cache and response-ownership assertions rather than deleting coverage indiscriminately.
- Old caches contain country-dependent entries → Use a fresh build namespace and never mix incompatible releases under one prefix.

## Migration Plan

Implementation follows this new active change. Do not edit archived artifacts; leave canonical specifications unchanged until the normal later sync/archive workflow, where the country-first-paint requirement is removed and replaced by these deltas. The canonical purpose's old first-paint wording must be reconciled during that later sync, not by rewriting archived history in this proposal.

Build/deployment already generates a fresh `core/build/cache-version.json` prefix used by `cache-instance.ts`; use a fresh prefix for the adapted release rather than reading old country markers/responses. No live invalidation or Redis operation is part of this proposal. Verify neutral cache reuse and current-browser query flows with synthetic values before rollout. A rollback requires its own fresh build prefix; returning to the old release restores country-specific SSR and is not the approved end state.

No blocking business decisions remain: neutral SSR, detected-country/US fallback when saved data is unreadable, manual location change, valid-selection preservation and the existing invalid-selection Standard fallback are approved requirements. Loading copy and spacing can follow existing localized conventions. New retry UI, a changed storage timeout, delivery eligibility changes and incident response are outside scope and require separate authorization.
