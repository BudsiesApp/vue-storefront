# Design

## Context

See `proposal.md` for motivation and the approved workspace packet `tickets/37233-attribution-credential-protection/` for Epic R1–R6 / child V1–V5. Base: updated `origin/petsies-theme` `dd5d6b3ee`; branch `37235-protect-attribution-credentials`. The pre-existing modified payment submodule remains outside this change. Magento #37234 independently guards direct submissions; no dependency on Maestra attribution Epic #37230 is introduced.

### Observed ownership and bypass paths

| Owner | Relevant current behavior |
| --- | --- |
| Capture helper | `src/modules/traffic-attribution/helpers/get-traffic-attribution-data-from-route.function.ts:29–58,92–164` omits both names, allows a configured sensitive list to replace defaults, copies the raw referrer URL, and already uses origin/path-only landing URL. |
| State/storage/reporting | `store/actions.ts:106–173,201–219` restores stored touches and sends stored attribution, not a newly filtered landing. `store/mutations.ts`, `helpers/get-local-storage-items.function.ts` and `helpers/cache-handler.factory.ts` accept external storage events and write mutation/state payloads to storage. A capture-only list fix does not cover those future writes/submissions. |
| Diagnostics | Attribution actions/module/cache handlers log arbitrary caught storage/report errors. `core/scripts/server.ts:159–219` and `utils/ssr-response.ts:17–31,52–54,85–98` log original request URLs and error objects. Both named credentials currently survive in those URL strings. |
| SSR/cache | `core/scripts/utils/page-cache-key.ts:1–87` omits both names. `output-cache.ts:14–24,42–55` derives a clean render/key and stores response copies; `ssr-response.ts:96–100,127–146` reattaches request-local stripped pairs to fresh/cached redirects. Cleaning the key alone would not clean render/state or raw-request diagnostics. |
| Client continuity | `core/client-entry.ts:23–30` excludes serialized SSR `route` during hydration; the browser router uses its current location. The existing clean-render pipeline is designed to preserve current browser query consumers. |

The source evidence comes from `../37214-implementation/maestra-marker-investigation.md` and `vsf-applovin-browser-test.md`; the password reproduction was synthetic and the 170 ticket-field rows are not an incident or valid-ticket census. No new historical read was performed.

### Actual authentication and restoration consumers

- The inspected first-party runtime has **no literal `direct-crm-ticket` consumer** in app/core/theme, Magento custom modules or VSF API. `src/modules/maestra/index.ts` invokes PopMechanic page refresh; it does not implement ticket login. An external provider script/account might consume browser location; that is not established here and will not be implemented or tested with a real ticket.
- The existing sign-in helper `src/themes/petsies-capybara/helpers/use-authorization-page.ts:14–52,63–72` copies current route query into its redirect target. This is an actual generic consumer of both named query fields. `/authenticate/` routes query token/email into `pages/Authorization/Auth.vue`, whose mounted flow dispatches `user/authenticate`; password reset takes token/id/email route inputs and **form-entered password**, not a `password` query-field login. Those flows remain untouched.
- The theme recovery route `/alerts/recover/cart/id/:id/code/:code/` calls `budsies/loadRecoverableCart`; the API forwards its recovery code as Magento's history key. `CartRecovery.vue:65–110` also preserves `applyPromoCode` and returns to the detailed cart. Neither protected query field is its recovery credential or an attribution authorization signal.
- A pure in-container probe transpiled the **actual** capture/cache helper, sign-in redirect helper and recovery component. With synthetic state and mocked lifecycle/store/transport it confirmed both current capture/cache gaps, current-query preservation through the real auth helper, and unchanged recovery-code/promo dispatch (`/tmp/opencode/37233-privacy/discovery.cjs`). No browser authentication, network request, live credential or notification was used. Existing **7 focused suites / 69 tests pass**, including the actual recovery component suite; these are pre-fix baseline/compatibility evidence, not completed privacy acceptance.

## Goals / Non-Goals

**Goals:** Keep attribution data safe at real future ingress/write/send boundaries, share clean SSR representations, and preserve only the current visitor's browser/redirect context. Reuse the existing lifecycle and cache implementation.

**Non-Goals:** No browser URL stripping, new login/provider flow, new cache engine/dimension/registry, generalized secret detection, recursive parsing of arbitrary payload strings, historical storage sweep, route-wide capture, marker ownership/acquisition additions, API/theme/payment feature changes or production operations.

## Decisions

### 1. A small two-name predicate and attribution-copy sanitizer

Use a narrow pure utility under `core/helpers/credential-query.ts` for the two protected semantic names and URL-pair filtering; core SSR must not depend on an app attribution module. This is a small shared function, not a pluggable registry or redaction subsystem. An attribution-specific helper composes it with the existing touch shape.

Match decoded names by ASCII lowercase with hyphens/underscores removed, consistent with current sensitive-key normalization. Structured route/maps already have decoded names; URL pairs decode names **once**, not values recursively. Remove recognized pairs from attribution URL query and query-shaped fragment copies (plain query fragment or fragment-route `?query`), retaining ordinary fragments and unrelated raw pairs/encoding. No new credential aliases, campaign parsing or arbitrary content scanning.

Add the two names to shipped `trafficAttribution.sensitiveQueryKeys` and the fallback for discoverability, and enforce the two-name exclusion **independently** of configured sensitive arrays. Existing custom sensitive lists remain authoritative for other names; existing acquisition overrides stay replacement lists. A credential-only landing cannot become acquisition merely because a custom acquisition list contains its name.

Use the safe URL-copy operation for document referrer and any supplied touch URL fields. Keep the existing origin/path-only browser landing policy. Normal allowed query values, paid/affiliate/message IDs and exact key spelling remain unchanged; do not synthesize UTMs or implement marker classification.

**Cost:** rung-2 reuse plus rung-4 small glue. Only adding configuration misses bypasses; a new transport/server-capture architecture or general redaction framework is more expensive and unnecessary. Metadata URL filtering is needed because actual referrer capture and alternate touch submissions can carry the named fields outside the route map.

### 2. Protect future state/storage/outbound copies, not a historical sweep

Apply the attribution sanitizer at `SET_FIRST_TOUCH`/`SET_LAST_TOUCH` state ingress, at the existing cache-handler storage writes (including sent-flag writes), and immediately before `sendAttribution` serializes its body. The storage handler sees original mutation payloads, so relying solely on a cleaned state assignment is insufficient. This covers synchronization, cross-tab events, and direct synthetic state/reporting bypasses without a new queue or state machine.

Preserve every touch's created/expiry timestamps, sent flag and identity, and retain existing First/Last ordering, gate, suppression and success/failure semantics. Sanitize copies rather than mutate caller-owned raw route/touch objects. Do not enumerate old storage, change TTLs or add a migration/cleanup command. A previously stored touch encountered in an **ordinary future** ingress/write/send is filtered at that boundary; untouched historical storage is not scanned, and no upgrade-wide cleanup is claimed.

Keep attribution diagnostics operation-specific and payload-free. Replace arbitrary caught reason/error serialization at the affected attribution read/write/report sites with fixed operation-identifying diagnostics (and safe bounded status/type where already available). Do not print original failed touches or free-form storage errors that can embed values. Preserve nonblocking behavior; do not add success logging, retries or new triggers.

### 3. Extend the existing SSR clean-render/current-request pipeline

Teach `splitPageCacheUrl` to treat the two protected semantic names as ignored alongside the unchanged exact-name policy for other keys. Enumerate/remove matching decoded occurrences from the clean URL and collect original encoded pairs into the existing request-local `strippedQuery`. Reuse `createOutputCache`, clean SSR navigation/state and fresh/cached redirect append; never put stripped pairs into a cache entry, HTML/state, diagnostic or shared header.

Leave browser location and the live Express request unchanged. Current-request pairs can appear in **that request's** redirect Location, not in the cached clean redirect. Preserve original pair encoding, destination-key precedence, significant queries, store/A/B dimensions, cache-disabled clean rendering and existing trailing-slash/error routing. Fragments are not sent in an HTTP request; existing redirect fragment placement remains covered by the helper tests.

This is not merely key omission: test clean markup plus all serialized route/current/previous state, cached headers/body/redirect paths, key strings and current-browser hydration. Do not alter authentication components or rely on SSR state as a source for the browser's credentials.

### 4. Close the evidenced SSR diagnostic copies without a general logger rewrite

Add a narrow request-diagnostic view at the existing SSR entry/response boundary, using the same two-name URL predicate. All identified timing/cache/completion/response-already-sent/error/final-failure call sites use a credential-free URL, never request-local stripped query.

For requests containing either protected name, render/cache/output/cleanup error diagnostics must not serialize a raw free-form error or Express request that can repeat the original URL/value. Emit a fixed operation identifier plus safe type/numeric status and safe URL. Pass an equivalently safe **diagnostic copy** into `ssrException`, not the credential-bearing original request/error. No actual runtime `ssrException` consumer was found beyond the hook definition; its diagnostic view must not mutate the live request used by routing/auth/browser continuity. On requests without either protected field, preserve existing diagnostic detail/behavior. Do not install global logger interception or change unrelated auth/provider logging.

The metadata-only view deliberately sacrifices free-form exception detail **only for the two-name-bearing request class**, avoiding a generalized value-redaction engine while meeting the approved non-disclosure outcome. Tests inject errors whose messages repeat synthetic values at each covered failure stage and spy on both first-party logging and the exception-hook payload.

### 5. Compatibility and proof use existing consumers, not real credentials

Implementer automated tests extend existing capture/actions/storage, page-key/output-cache/response harnesses. Cover shipped/fallback/custom-empty sensitive lists; mixed-case/separator/encoded names; repeated URL pairs; metadata URL bypasses; direct mutation/storage/send ingress; safe rejection diagnostics; and allowed source/paid/affiliate/message controls. For shared output, use visitor A/B/query-free in both orders, cold/hits, normal and redirect output, cache disabled and functional store/query dimensions.

Use existing real auth helper/recovery component with synthetic routes and mocked transport to verify their required current-user inputs survive. No new provider-ticket consumer is built. No live/retained ticket or actual password is requested, decoded or replayed; form authentication APIs remain outside the filter.

Tester handoff (not implementation tasks): a local browser follows fresh/cached redirects with synthetic named fields, verifies its own URL/route remains available, and confirms clean new attribution state/body plus clean fixture-only Redis entries. Invoke the existing auth redirect consumer with synthetic/mocked transport and recover a synthetic local cart without a provider message; preserve recovery code/promo/authorization behavior. An allowed UTM/paid/affiliate/message cart-event journey goes through the real local VSF API to protected Magento, with First Touch retained and Last Touch sent normally. The backend is the only classifier; these allowed markers are not newly recognized acquisition keys by this change.

## Risks / Trade-offs

- [Custom filtering can otherwise re-enable a credential] → Mandatory two-name floor only; preserve override semantics for every other key.
- [Old touches can be forwarded or rewritten by ordinary synchronization] → Filter future ingress/write/send copies; no global historical enumeration or remediation claim.
- [A clean cache key can still share credential-bearing SSR state] → Reuse clean rendering, assert full HTML/state/cache entry contents and cache-disabled output, not just keys.
- [Raw error messages or SSR exception hooks can repeat the original URL] → Narrow safe diagnostic view for protected-name requests and injected-error regressions; preserve the live request.
- [Unknown external provider behavior cannot be proved by a fake ticket] → Preserve native current-browser context and existing first-party consumers; explicitly limit acceptance to synthetic compatibility, not provider-ticket validity.
- [Overlapping marker work touches the same helper/tests] → Independent child branch and later normal merges; no hard dependency on Epic #37230 and no classifier/acquisition expansion here.
- [Petsies-target CI is mistaken for every brand's rollout] → App CI selects Petsies/Budsies/Education/Waggables theme combinations and payment `optimuspro` unless matching ticket branches intervene; record actual matrix. Bulk Orders app propagation/release is separate.

## Migration Plan

1. Review the two child specs, then implement each independently. No schema/config-secret/dependency migration is required; do not change the existing payment pointer or delivered archives.
2. Run focused/required checks and tester's local browser/cache/consumer compatibility evidence before feature acceptance. Keep generated local error logging disabled and restore any temporary local cache setting after testing.
3. Publish only through separately authorized merges/brand propagation/release. Either child offers independent prospective protection; full Epic acceptance requires both, not Maestra marker work.
4. Rollback removes prospective protection and needs normal approval. Existing browser/server historical data, exposure assessment, cleanup, rotation and notifications remain separately authorized operations; no old-data purge is part of release or rollback.
