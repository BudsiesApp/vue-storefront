# Design

## Context

Authority: `tickets/37233-attribution-credential-protection/requirements.md`, decisions P15, exact operator inputs 17/26/27, settled PM clarifications 28–30 and input-12/P9. All stored backend/browser values are exempt from recleaning, including later copies, storage, reporting and the existing TaskQueue execution task-body diagnostic. R3 remains required for actual fresh-input shared/cache/diagnostic paths. No old P6/P13/P14 review, fixture or CI receipt overrides this scope or accepts this revision.

Branch `37235-protect-attribution-credentials`, published head `9a4364a33393e5f3f7f0c61c76264c299c6d4494`. `git ls-remote origin refs/heads/petsies-theme` confirms current target `23b8139ac86ae216df4629594609257fea763951`; Git confirms it is an ancestor. The complete target-to-head diff has 33 files, including active specs. No runtime implementation is changed in this specification revision. Preserve the user payment-submodule difference and released Maestra work already present in the target.

### Actual fresh producers and consumers

- `getTrafficAttributionDataFromRoute()` creates a new attribution object and normalized query map from the current client route. It already uses only browser origin/path for `landing_page_url`; `document.referrer` supplies the one full URL carrier. Browser referrer generation strips the fragment ([Referrer Policy §8.4](https://w3c.github.io/webappsec-referrer-policy/#strip-url), algorithm sets fragment to null); neither it nor an HTTP SSR request supplies fragment data. This is the fresh attribution boundary, not the touch mutations or saved-data loader.
- `SYNCHRONIZE` reads stored touches before fresh capture; cross-tab events parse saved values then commit them. Mutations already assign supplied touches, the subscriber persists them and reporting sends state getters. Under P15 these are ordinary consumers, not additional cleaning boundaries. There is no evidenced dirty SSR hydration producer requiring another filter.
- `splitPageCacheUrl()` supplies `cleanUrl` to the existing SSR render/key pipeline and request-local original encoded `strippedQuery` to redirects. Without the two-name extension, a fresh protected query can enter shared HTML/state/cache. This is a real required producer fix independent of saved-touch scope.
- `server.ts` directly logs `req.url` at completion, cache hit/miss/redirect and final failure; `ssr-response.ts` logs it in error/already-sent/write-failure paths. Those explicit URL arguments are concrete fresh-input diagnostic carriers. Arbitrary error objects are not classified as protected just because they are opaque or a test injects a secret string.
- Queue execution logs the task object. Fresh bodies already come from capture; P15 expressly exempts an unchanged old touch in that existing diagnostic. Magento `save(): bool`, API forwarding and a fabricated HTTP error response do not prove the queue's result/error contains either selected field. LocalForage/storage catch paths likewise provide no documented selected-field reflection merely because their rejection type is broad. Do not infer one or suppress those diagnostics speculatively.
- There is no first-party `direct-crm-ticket` login consumer. Actual auth redirect code preserves current query; authentication/password reset use their existing API/form inputs, and recovery consumes route id/history key plus promo context. Preserve these interfaces without inventing a ticket flow or exposure claim.

## Goals / Non-Goals

**Goals:** the cheapest sufficient fresh-input policy, normal downstream flow, unchanged saved-value reuse, isolated shared rendering and safe explicit diagnostic URL fields. Preserve P9, all allowed data, First/Last lifecycle, Maestra support and native browser/auth/recovery context.

**Non-Goals:** no legacy admission/sanitizer, migration/purge, version marker, custom storage protocol, new TaskQueue option, generic error/redaction wrapper, hook-contract replacement, new cache machinery, recursive value scanner, route-wide capture, classification/provider integration, new dependency or production action.

## Decisions

### 1. Enforce two names once at fresh capture

Retain only the small shared `core/helpers/credential-query.ts` name/pair and ordinary-query URL-copy operations; remove its fragment parser. SSR cannot import an app module. Match decoded names by ASCII lowercase with `-`/`_` removed, only `password` and `directcrmticket`. Structured route names are already decoded; decode URL-pair names once. The route-query producer applies this predicate before the existing configured-sensitive-key test and before acquisition eligibility. Remove this PR's duplicate two-name additions to both the configurable fallback and `config/local.json.template`; they add no guarantee once the mandatory floor exists. Other defaults/overrides, including acquisition replacement lists and current Maestra marker eligibility, remain unchanged.

The query helper already returns a new map; the capture helper already returns a new object. Keep fresh referrer URL filtering and origin/path-only landing. No `sanitizeAttribution`/`sanitizeTouch` abstraction, additional query-map clone in `createTouchData`, mutation sanitizer or downstream send filter is needed. Do not add alternate-touch APIs to preserve a withdrawn guarantee.

### 2. Remove the unreachable UI fragment parser without changing P9

Filter ordinary referrer-query pairs only. The former fragment branch was justified by saved/alternate touch URL admission; that path is gone. Fresh capture does not take arbitrary full landing URLs, hash-route strings or touch objects. Its landing is origin/path, `route.query` is a structured map, browser referrer fragments are already stripped by the platform, and HTTP SSR URLs have no fragment. A mock replacing `document.referrer` with an impossible fragment is not a supported entry point. Remove fragment-parser code and its standalone/legacy test matrices rather than preserve a framework guarantee with extra handling. Do not introduce an alternate producer solely to keep those tests.

P9 remains unchanged for Magento's actual fresh full-URL request fields: its exact selected identity result is `https://example.test/page?utm_source=allowed#route=one?password=synthetic&keep=x`, with the same ticket/equivalent-name variants, established exclusions and narrower relative-route guarantee. VSF must leave that live browser URL/auth context untouched and preserve allowed structured query values; its existing origin/path-only attribution landing policy is not a new P9 omission. Exempt saved URL strings, including this exact string, pass unchanged without parsing. Preserve ordinary referrer-query pair bytes/encoding/order and do not recursively inspect an allowed value containing protected-name text.

### 3. Restore ordinary stored-data and reporting flow

Remove stored-touch sanitization in `SYNCHRONIZE` and `getItemsFromStorageFactory`, delete the now-unused attribution/touch sanitizer and restore subscriber SET writes from their existing mutation payload. Mutations already have no target-to-head diff; leave them alone. Restore the privacy-only extra query clone in `createTouchData` to the ordinary target flow: the real fresh producer allocates the map, and arbitrary later internal mutation is not an external-input reason for another defense.

Old saved values, including both selected names and supported URL carriers, may enter state, be persisted, receive ordinary sent flags and be reported unchanged. Preserve expiry, identity, First/Last ordering, initial-only capture, duplicate/in-flight/failure behavior and success-only sent flags. No sweep, stored-data version, recleaning or legacy-clean-working-copy contract. A later HTTP report is independently filtered by Magento, without retroactively changing browser storage.

### 4. Keep only necessary shared-output and diagnostic URL changes

Retain the two-name predicate in the existing page-cache split: all recognized decoded names leave the shared render/key and remain only in current-request original encoded stripped pairs. Reuse existing clean render, output-cache read/write, fresh/cached redirect append and client current-location hydration. No new output-cache plumbing, cache type, dimension, SSR capture or redirect engine is required. Preserve significant queries, store/A-B dimensions, destination-key precedence, fragment placement, query-free/parameterized order and cache-disabled clean rendering.

At existing direct SSR URL-log producers, compute the diagnostic URL with the same small two-name URL operation and log that string instead of original `req.url`. Preserve the actual request and unrelated URL context. This meets the concrete fresh-input R3 path at its owner; do not use the cache clean URL to gratuitously remove other tracking data from diagnostics.

Remove `ssr-diagnostics.ts` and its protected-request/error/request-view wrapper. Restore original error objects/details and original `ssrException` request/error arguments. No actual hook consumer was found that serializes protected fields, and no actual error producer establishes that it repeats them; an injected `Error('synthetic')` does not justify lost failure detail or a changed hook contract. Keep operation names, existing error handling, containment, redirects, asynchronous writes and cleanup unchanged. No new blanket promise for hypothetical storage/HTTP/render errors. A demonstrated new fresh protected-value path would need its producer fixed, not speculative downstream guards.

### 5. Whole-PR disposition against the current target

This list covers every source/config/test/doc group in the complete 33-file diff, not only the latest correction. Restoration means remove only this PR's privacy hunks, preserving other target/released Maestra behavior and user work.

| PR group | Revision and reason |
| --- | --- |
| `config/local.json.template`; capture helper's sensitive fallback additions | Remove the redundant two-name list additions; the shared mandatory predicate already owns the invariant under defaults and overrides. Keep all unrelated lists. |
| `core/helpers/credential-query.ts`; capture helper | Keep the narrow name/ordinary-query operations and fresh route/referrer application. Remove fragment parsing: real fresh browser/HTTP URL producers do not supply a fragment; P9 still applies to Magento's full-URL intake. No live URL mutation. |
| `helpers/sanitize-attribution.ts`; saved-load hunks in `store/actions.ts`; `helpers/get-local-storage-items.function.ts` | Remove the file/imports/calls: all saved/cross-tab recleaning is withdrawn. |
| `createTouchData` query clone; `helpers/cache-handler.factory.ts` payload-to-state changes | Restore the target flow. Fresh capture already allocates its values; saved data is exempt. `store/mutations.ts` has no PR diff and needs none. |
| `core/lib/sync/task.ts`, `types/Task.ts`, `test/unit/task.spec.ts`; action `logResponse` | Remove the entire option/suppression/type/tests. Old task-body fields are exempt; no evidenced fresh response/error field producer supports this extra mechanism. Preserve unrelated queue diagnostics/results/transport. |
| Storage-read/report/module/subscriber logging hunks in actions, `index.ts`, cache handler | Restore existing diagnostic detail; no selected-field rejection/response producer was established, and no generic error confidentiality policy is approved. Existing fixed status-failure reporting stays as on target. |
| `page-cache-key.ts` | Keep the semantic two-name split/clean extension. It feeds an actual shared render/key path; do not broaden unrelated cache-name matching. |
| `server.ts`, `ssr-response.ts`, `ssr-diagnostics.ts` | Keep only replacement of explicit request-URL diagnostic arguments with a filtered URL. Remove wrapper/error suppression/request-hook substitution and delete the unused wrapper. |
| Core `credential-isolation.spec.ts`; `fixtures/output-cache.ts` | Keep semantic split/current-request and direct URL-log preservation tests at real SSR seams. Remove arbitrary injected-secret error confidentiality expectations and wrapper-only imports/fixtures. Preserve baseline error containment and diagnostic detail tests. |
| `output-cache-isolation.spec.ts`, `output-cache-redirects.spec.ts` | Retain two-visitor/query-free, cache-disabled and current-request redirect proof with actual selected query fields; preserve existing Maestra tests. No new runtime cache plumbing. |
| Capture `get-traffic-attribution-data-from-route.spec.ts`; `credential-protection.spec.ts` | Keep/move actual fresh route/referrer and mandatory-floor/override checks; remove sanitizer/private-internal/fragment/legacy-cleaning matrices. Test outcomes through real capture rather than inventing alternate dirty-state/hash ingress. |
| `actions.spec.ts`, `storage-helpers.spec.ts` | Replace old-cleaning assertions with concise unchanged stored-load/cross-tab/report regressions; retain fresh captured state/storage/report continuity. Remove response/error suppression tests and logResponse expectations, not baseline lifecycle coverage. |
| `module-reporting.spec.ts` | Remove the added suppression-only suite; existing module behavior is restored. Keep baseline nonblocking/report lifecycle coverage rather than manufacture rejected-secret strings. |
| `auth-compatibility.spec.ts`, `recovery-compatibility.spec.ts` | Retain small actual-consumer synthetic compatibility checks for R4, with mocked transport and no ticket-login validity claim; reuse existing theme coverage instead of duplicating a wider matrix. |
| Attribution `README.md`; six active OpenSpec artifacts | Replace broad future-state/legacy-cleaning and blanket diagnostic promises with this boundary, P9 and old-data limitation. Earlier completed tasks are historical; current removal/proof tasks are pending. |

**Cost:** rung-2 reuse plus small rung-4 predicate/URL glue at actual producers. The same tiny URL helper serves capture and explicit SSR URL logging; existing cache plumbing supplies isolation/redirect continuity. Configuration alone misses overrides, referrer URLs, independent backend and shared output. State admission, response-logging controls and error/request-view subsystems add maintenance without a current required path; remove them. No remaining required outcome forces a higher rung or needs a new product choice.

### 6. Proof and tester handoff

Implementer: retain focused real capture/helper, mandatory-floor under shipped/fallback/custom arrays, ordinary referrer query, allowed raw context and no-live-mutation coverage. P9 exact-value/fragment exclusion proof belongs to the actual Magento fresh URL carrier, not an invented UI hash/referrer producer. Use actual synchronization/mutations/subscriber/reporting for fresh downstream continuity and concise unchanged old-touch/cross-tab controls; do not assert old values become clean. For diagnostics use actual request-URL fields in the existing server/response harness and assert ordinary exception detail remains, not fabricated secret-response/error strings. Retain full shared HTML/state/key/value and current-request redirects in both arrival orders, cold/hits, cache disabled and functional dimensions, plus actual auth/recovery-consumer checks. Run maintained and core suites separately with lint/build/strict spec checks in containers; record actual CI theme/payment selection later, with no pointer change.

Tester: synthetic local browser fresh capture, normal cart event through the existing VSF adapter and Magento fixture-row inspection; show retained First Touch/eligible Last Touch and released Maestra behavior. One old saved/cross-tab touch may report unchanged client-side while Magento's normal HTTP intake filters it. Demonstrate two-visitor/shared-cache and current-request browser/redirect behavior plus explicit URL-log exclusion using synthetic named values. P9 preservation/limitation and existing mocked auth/recovery inputs remain controls. Do not scan old storage/database, replay credentials, send provider messages or create real orders/payments. Old-scope results/CI are provenance only, not this revision's acceptance.

## Risks / Trade-offs

- Old values may persist, report and occur in the existing execution task-body diagnostic unchanged: explicit P15 exemption, not remediation or a reason to add more logs.
- Named exclusion is not recursive value scanning or a local login-incident claim. P9 deliberately retains ambiguous allowed values.
- Removing invented error confidentiality preserves useful failure detail; future real producer evidence, not opaqueness or arbitrary mocks, would justify a targeted correction.
- SSR URL isolation remains required even though storage cleaning is removed. Retain its real shared-output path rather than deleting protection wholesale.
- App CI also builds dynamically resolved theme/payment branches. Preserve their state, verify actual combinations later, and do not claim Bulk Orders propagation or production rollout.

## Migration Plan

Review both active revisions, implement the pending removal/proof tasks and obtain independent technical/product/test acceptance. No data/storage migration, purge, framework, dependency or service change. Keep local error logging disabled and restore any later temporary cache-test setting. Publication, merge, archive, deployment, rollback, historical cleanup and provider/customer actions remain separately authorized; prior Review-only status is not permission to perform them.
