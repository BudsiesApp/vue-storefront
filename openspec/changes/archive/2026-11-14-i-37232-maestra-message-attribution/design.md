# Design

## Context

See `proposal.md` and approved `tickets/37230-maestra-message-attribution/` R1–R8/V1–V5 and decisions M1–M5. Base: fetched `origin/petsies-theme` `dd5d6b3ee`; independent branch `37232-maestra-message-attribution`. Preserve the existing modified payment submodule and independent privacy branches/active changes.

### Discovery

- Capture helper `src/modules/traffic-attribution/helpers/get-traffic-attribution-data-from-route.function.ts` retains arbitrary non-sensitive query values, builds origin/path-only landing URL and matches acquisition names case-insensitively. The fallback list and shipped `config/local.json.template:114` omit the click marker. An explicit configured array replaces defaults.
- Normalization omits empty/null values but retains whitespace strings. The gate at lines 200–216 tests key presence, not content. A small marker-specific nonblank eligibility check is needed; globally trimming all raw query values would violate preservation.
- `store/actions.ts` captures during initial synchronization, initializes both touches when no unexpired First Touch exists, otherwise gates a different Last Touch, and reports stored raw context through TaskQueue after existing cart-created/cart-connected events. No new action/state/transport is needed.
- `core/scripts/utils/page-cache-key.ts` already creates a clean render/key plus original encoded request-local stripped pairs; output-cache/SSR response handlers append only the current request's pairs to fresh/cached redirects. Documented lowercase `m-message-click-id` is absent from the ignored list. Exact-name cache matching and case-insensitive acquisition matching are intentionally different existing policies.
- Adjacent API on `budsies`, `src/api/extensions/budsies/index.js:304–325`, forwards the raw body with existing store/auth context. No allowlist/enrichment/classifier change is needed. Magento owns the scoped recovery exception; theme recovery/authorization consumers remain untouched.

Canonical capture and SSR isolation specs and archived `2026-11-12-i-37214-update-traffic-classification` supply the lifecycle/cache model. The source marker/recovery investigations are bounded evidence, not a production lost-click rate or verified send count. Unchanged discovery baseline: **7 focused suites / 69 tests pass** (capture/actions/page-key/output-cache redirects/isolation/SSR response and actual recovery component). This is not new-feature acceptance.

## Goals / Non-Goals

**Goals:** Configure the existing acquisition and SSR mechanisms for one documented tracking name, preserving current raw/First/Last/reporting and request-local browser behavior. Magento alone interprets delivery ownership.

**Non-Goals:** No `m-message-key-id` standalone policy, aliases/generic `m-*`, campaign/channel inference, synthetic UTMs, new capture trigger, immediate reporting, transport/state/cache subsystem, schema/dependency, API/theme/payment feature, provider action, historical operation or production rollout. Existing credential exclusions are not weakened or independently reimplemented here.

## Decisions

### 1. Both defaults, existing replacement overrides, one nonblank eligibility check

Add exactly `m-message-click-id` to `DEFAULT_ACQUISITION_CLICK_ID_KEYS` and the shipped `trafficAttribution.acquisitionClickIdKeys`, retaining every existing key. Keep `getConfiguredList` replacement behavior, including an empty/custom array excluding this marker. Do not force a mandatory union or add the key marker.

Use the existing normalized raw string and case-insensitive key match; marker-only eligibility requires its value to be nonblank after a trim check. Do not change the retained raw string, key spelling, normalization of other acquisition IDs, or invent token-format/length/identity validation. A blank click marker does not newly qualify a return under this key; other existing UTM/referrer/configured signals may still qualify it. No First Touch still initializes under the existing unconditional first-capture rule, not a new marker validation gate. An explicitly configured acquisition array remains authoritative.

Tests use the actual shipped-template acquisition block and absent-config fallback, not only a mock list. Cover nonempty, empty/null/whitespace, case variants, key-only context and custom omission/empty arrays, with existing Google/AppLovin/UTM/referrer controls. Raw allowed values remain exact under current route normalization; markers are not moved into landing URLs or `utm_id`.

**Cost:** rung-1 configuration/rung-2 reuse plus a few rung-4 eligibility lines for the approved nonblank outcome. Lists alone leave whitespace-only return eligibility and SSR isolation uncovered. A provider-specific action, shared registry or new collection mechanism costs more without meeting an additional required outcome. No options trade-off is needed for this bounded extension.

### 2. Reuse initial client state and queued reporting unchanged

Keep First Touch, expiry, current duplicate comparison, Last Touch sent state and First-before-Last reporting. An unexpired Google First Touch plus a different marker-only initial return receives an unsent Last Touch; it is reported only on the existing cart event and marked sent only after success. A new browser's initial capture still follows the current lifecycle. No route watcher, SSR touch capture, immediate POST, retry, per-cart sent registry or marker-to-UTM mapping.

Use actual actions and existing storage/report spies to inspect the queued `{ request: rawTouch }` body. Preserve nonblocking failure/in-flight/duplicate handling and current synchronization semantics. Privacy #37233's producer-owned filtering stays independent during normal later integration; do not import its branch as a prerequisite or resurrect credentials as required raw context.

### 3. Add one exact lowercase SSR tracking key

Add documented lowercase `m-message-click-id` to `ignoredQueryKeys` in the existing page-cache helper. Reuse `splitPageCacheUrl`, `createOutputCache`, clean SSR route/state and `appendStrippedQuery`. This removes the value from shared keys/rendered HTML/state/cache entries while retaining the current request's original encoded query pairs for redirect Location and current-browser capture.

No case-insensitive expansion of unrelated cache matching, second stripper, cache bypass, new dimension, value re-encoding or key-marker addition. An acquisition case variant can still qualify under the existing gate; only the documented lowercase name is added to exact-name SSR policy. Test this distinction rather than claim all spellings share cache treatment. Keep destination-key precedence, duplicate encoded pairs/fragments, significant queries, stores/A-B groups, cache-disabled clean rendering and existing error/trailing-slash routing.

Two synthetic visitors and a query-free request must cover query-free-first/parameterized-first, cold/hits, HTML and fresh/cached redirects. Assert full serialized current/previous route/state and cache entry/keys, not only absence from the key. A browser still obtains its own route from its live URL, never another request or a fabricated SSR attribution object. `m-message-key-id` remains ordinary raw context; standalone cache/acquisition support is deliberately deferred.

### 4. Repository and publication boundaries

Only this app needs a UI implementation branch. Existing API forwarding and theme recovery/authorization need no code/branch change. CI `.github/workflows/test_vsf1.yml` and `.github/scripts/resolve-pr-ci-selection.js` dynamically select `vsf-capybara` themes and `vsf-payment-braintree`; without matching ticket companions the Petsies-target app builds its existing Petsies/Budsies/Education/Waggables theme matrix and payment `optimuspro`. Record actual selected branches/SHAs later, do not commit user submodule pointers or assume CI uses recorded gitlinks. Bulk Orders app propagation/brand release remains separate.

Magento #37231 acceptance precedes **expanded UI publication** per the issue relation/manifest, not UI implementation start. Neither child depends on privacy #37233's PR. Preserve its branch/active specs and coordinate later overlapping helper/cache changes through the normal Git workflow. Document acquisition/config overrides, exact-name cache policy, no channel/authenticity inference, lifecycle and release ordering in the attribution README.

## Risks / Trade-offs

- [First-visit tests hide a returning visitor's gate gap] → Use retained Google First Touch and a different click-only initial landing; assert original First Touch/metadata unchanged and Last Touch eligibility/success semantics.
- [A configured deployment masks a fallback-only change] → Update/test template and fallback plus explicit overrides. Regenerate local rendered config through the documented container procedure only when implementing/testing, without committing generated config/secrets.
- [A coarse key gate treats whitespace as acquisition] → Apply only the small nonblank click-marker eligibility check; preserve raw values and all other key policies.
- [Acquisition matching is broader than SSR exact-name policy] → Document/test the existing distinction; do not infer aliases or normalize unrelated keys.
- [Cache cleaning loses this visitor's input] → Preserve browser URL and current-request encoded redirect context, verify both arrival orders plus hydration through existing harnesses.
- [Provider clicks are mistaken for Magento touches] → Marker convention is not email, customer identity or cryptographic send proof. No one-to-one provider report/count claim.

## Migration Plan

1. Review both independent changes, implement this small lists/eligibility/tests/docs extension and run focused attribution/core plus required maintained/lint/build checks in the documented container. No schema/dependency migration.
2. Tester later uses synthetic initial/return landings, fresh/cached redirects and fixture-only cache reads, then an actual local cart event through VSF API to accepted Magento. Preserve auth/recovery with synthetic local fixtures/mocked transport and no provider/customer message or real credential. No historical scan or classifier command is needed.
3. Publish only after Magento #37231 behavior is accepted and normal release approval is obtained. Implementation can proceed in parallel; theme/brand propagation is later work. No production action is authorized by this spec.
4. A separately approved rollback changes future capture/cache behavior only; it does not restore lost historical clicks or rewrite stored touches. Standalone key-marker semantics remain a nonblocking provider/account-owner question.
