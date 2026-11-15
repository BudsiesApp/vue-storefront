# Design

## Context

See `proposal.md` for scope and the same-name Magento change for classification, reporting evidence, and historical recommendations. The operator's later #37214 input “implement VSF side too” extends the former storefront exclusion only to bounded AppLovin acquisition/capture support; it does not reopen the accepted Magento taxonomy or approve a release.

Development uses the mounted VSF UI checkout on the ticket branch from `petsies-theme` `428205e312cfa00439cd953b910bc1eaf5e55c4a`, Petsies theme, and existing local API/Magento domains. The base fast-forward changed only the development-image references in `docker-compose.yml`; no service was recreated. The pre-existing modified payment submodule pointer is not ticket work and must not be committed or reset.

### Existing flow and evidence

- `src/modules/traffic-attribution/index.ts` runs storage/capture only on the client. `SYNCHRONIZE` captures the initial route; without retained First Touch it initializes both touches regardless of the gate, otherwise it preserves First Touch and replaces a different Last Touch only after acquisition detection.
- `helpers/get-traffic-attribution-data-from-route.function.ts` already retains non-sensitive query keys/values in raw `query_params`, builds origin/path-only `landing_page_url`, and matches acquisition key names case-insensitively. Its fallback and `config/local.json.template` each contain 18 existing acquisition keys but neither AppLovin key. A configured array replaces, rather than unions with, fallback keys.
- A read-only synthetic source probe tested seven inputs against both actual fallback and extracted shipped-template keys. `aleid` alone, `alart` alone, and both were **false**; the UTM pair and existing `gclid` were **true**; direct and empty/null AppLovin inputs were **false**. Both raw AppLovin keys already survive capture. This establishes the UI gate gap without claiming a production identifier-only loss.
- `store/actions.ts` already queues `{ request: rawTouch }`, submits unsent First Touch before a different unsent Last Touch, and marks sent only on success. Existing `cart-created`/`cart-connected` listeners trigger reporting; there is no route-wide or immediate-update reporting hook.
- VSF API `BudsiesApp/vue-storefront-api` on `budsies` at `2ced517be344ab07bf5f776579b2e6597e20399b`, `src/api/extensions/budsies/index.js:304–325`, forwards `req.body` directly to the cart attribution endpoint with existing store/auth context. No parameter allowlist drops these keys. No API change/branch is necessary.
- `core/scripts/utils/page-cache-key.ts` omits existing tracking keys from both cache keys and the clean SSR render URL, retains original encoded stripped pairs for the current response, and reattaches them to clean cached/fresh redirects. Neither lowercase AppLovin name is present, so the probe confirms they currently remain significant to the cache. Existing `ssr-output-cache-isolation` requires visitor-independent HTML and current-request query forwarding; add keys to that mechanism, not a second one.
- The unchanged discovery baseline passes **4 suites / 38 tests**: traffic capture helpers, actions, page-cache-key, and output-cache-redirects. These tests do not yet assert AppLovin support. Magento separately passes its accepted 18 synthetic API scenarios and 60,372-row replay with 337 changes at `3a3d760f31bd56c71d3fb6cd4559e5508bbcc51c`; those are not UI/browser coverage.

Historical context is `openspec/changes/archive/2026-06-06-i-36653-update-traffic-attribution-capture/`. It documents the implemented initial-landing gate/lifecycle, but this base has no canonical `traffic-attribution-capture` spec. The new delta reuses that historical capability name with narrowly added AppLovin requirements and a Purpose; it does not manufacture a MODIFIED block for a missing canonical requirement or reconstruct the entire archive. The existing canonical `ssr-output-cache-isolation` receives an additive requirement for the two keys; no existing requirement is removed or weakened.

## Goals / Non-Goals

**Goals:** Correct the supported-key lists where the behavior is owned; let documented identifier-only initial landings qualify while retaining raw context, existing First/Last semantics, filtering, reporting, and cache isolation. Keep the existing Magento classifier authoritative.

**Non-Goals:** No classification/UTM synthesis in JS; no new capture, transport, persistence, redirect, validation, retry, or shared key-registry architecture. No new token-format/whitespace policy, server capture, router listener, immediate reporting, per-cart sent state, retention adjustment, cache dimension, endpoint/auth change, pixel/Conversion API/campaign work, dependency/CI change, production access, deployment, or historical reclassification.

## Decisions

### 1. Extend both existing acquisition lists, not the gate algorithm

Add `aleid` and `alart` to `DEFAULT_ACQUISITION_CLICK_ID_KEYS` and the shipped `trafficAttribution.acquisitionClickIdKeys` in `config/local.json.template`, retaining all existing entries. Do not change `getConfiguredList`: explicit custom arrays, including exclusions/empty arrays, remain authoritative. A fallback-only fix would not work in the configured deployment; a template-only fix would leave default consumers unsupported.

Use existing query normalization, case-insensitive gate matching, and sensitive-key filtering. Both names are documented advertising signals, not authentication keys, and are not in the existing sensitive denylist; no exception or filtering rewrite is needed. Keep values and key spelling after existing route normalization; do not infer source/medium/platform, validate click syntax, trim/parse tokens, or alter normalization of other click keys.

Tests must exercise absent acquisition configuration and a configuration derived from the actual shipped template, not only a hand-edited mock containing the new keys. Include an explicit override that omits AppLovin to prove replacement semantics. Reuse existing tests for unaffected filtering, acquisition signals, and expiry instead of duplicating the full baseline.

Alternative rejected: append IDs only to a test mock, force mandatory union with every custom configuration, add a provider-specific branch in actions, or invent a common registry/service to replace the three existing small lists. Those either leave the real gap open or expand scope without a need.

### 2. Reuse raw capture, storage and reporting unchanged

No runtime-code change to actions, payload interfaces, module registration, Vuex/storage machinery, TaskQueue transport, or VSF API is expected. Add action regressions through the existing public actions with retained First/Last Touch and synthetic ID-only initial landings, then exercise existing reporting to inspect the exact queued raw body. The capture helper's fallback/config tests should cover each ID, both, mixed-case key names, explicit campaign UTMs, and empty/null omission alongside sensitive filtering.

Keep sent-state transitions and First-before-Last behavior. A newly captured Last Touch remains unsent until the existing report trigger succeeds; this work does not make every route change or Last Touch mutation send immediately. Preserve one-shot initial-SPA capture, first-touch write-once retention, and current global sent flags. UI capture never chooses between AppLovin/Google/affiliate owners: it forwards all retained raw keys so Magento's existing paid-ID precedence can decide.

Alternative rejected: add API allowlists/columns, a special AppLovin endpoint, `router.afterEach`, token-to-UTM mapping, or a new reporting event. Existing producers/forwarders already deliver raw values once the acquisition gate permits the touch.

### 3. Add lowercase AppLovin keys to the existing SSR isolation pipeline

Add exactly documented lowercase `aleid` and `alart` to `ignoredQueryKeys` in `core/scripts/utils/page-cache-key.ts`. Reuse `splitPageCacheUrl`, clean render/key behavior, and `appendStrippedQuery` through the existing output-cache/SSR response handlers. Do not add a second stripper, reconstruct/normalize click values, bypass cache for AppLovin, change existing exact-name matching, or alter redirect precedence.

Extend existing page-key tests and output-cache response/redirect harnesses with two different synthetic click values and a query-free request, in both arrival orders and on hits. Check clean keys/render URLs, shared HTML/state without tokens, significant query/store dimensions, original encoded redirect pairs, destination-key precedence, and fragments. Only these key-list additions are expected in core runtime code. Browser verification must also check that initial capture sees the current URL after neutral hydration/redirects; shared HTML is not the attribution source.

Alternative rejected: strip the browser URL or denylist the IDs to solve cache fragmentation, let cached redirects contain click values, or widen case-insensitive handling for every ignored query key. The first two would lose acquisition context or violate existing isolation; the third is unrelated normalization policy.

### 4. Keep repository, brand and CI boundaries explicit

Use the same branch/change name `37214-update-traffic-classification` / `i-37214-update-traffic-classification` as Magento, with the UI PR targeting `petsies-theme`. Magento PR #506's accepted classifier is the compatibility dependency. No VSF API, theme, payment, or cache-submodule branch/code/pointer change is required for this bounded UI addition.

UI CI `.github/workflows/test_vsf1.yml` and `.github/scripts/resolve-pr-ci-selection.js` build the app with `BudsiesApp/vsf-capybara` and `BudsiesApp/vsf-payment-braintree`; without relevant 37214 companion branches/PRs they select the default Petsies/Budsies/Education/Waggables theme branches and `optimuspro` payment. The resolver can select matching ticket branches at CI time, so record the actual resolved matrix/SHAs in the implementation handoff rather than promise it uses checked-in submodule pointers. No new companion implementation is planned.

The same three missing lists were inspected on `bulkorders-theme` at `19603d098466a29d5e4602bfe1c4e6558bc7e304`; it already has the same split-cache pipeline. Normal later brand propagation must adapt/carry the equivalent list/test changes there and validate Bulk Orders with its theme. Do not merge/propagate or start another UI as part of this planning task, and do not claim four-brand Petsies-target CI validates the separate Bulk Orders app.

Document acquisition keys/overrides, initial-only timing, sent/report triggers, privacy filtering, cache/redirect behavior, Magento dependency, and testing boundaries in a concise `src/modules/traffic-attribution/README.md` during implementation. Do not copy credentials, actual click values, private customer URLs, or raw production rows into fixtures/docs.

## Risks / Trade-offs

- [A retained First Touch hides the identifier-only gap in first-visit tests] → Include existing-storage initial landings and assert the First Touch remains byte-for-byte unchanged while Last Touch becomes eligible; a fresh browser alone is insufficient.
- [Generated or customized configuration can mask a fallback fix] → Change the tracked template and fallback together, test both, and regenerate/reload the local config through the existing development startup procedure during implementation/testing. Do not commit generated `config/local.json` or `.env` values.
- [Cache isolation can remove browser context if copied into the client flow] → Keep the browser URL intact, reuse current-request redirect reattachment, and verify current-route capture after clean HTML hydration.
- [Mixed-case gate matching is broader than exact-name SSR ignoring] → Preserve both existing policies; the added cache names are the provider's documented lowercase names. General case-insensitive cache normalization is not part of this addition.
- [Boot-only capture/global sent-state limitations remain] → Retain the #36653 model; do not silently promise route-wide acquisition, immediate reporting, per-cart resubmission, or recovery of clicks never stored.
- [Provider reports and backend tests are mistaken for browser-wide evidence] → Keep UI tests, Magento's 18 API scenarios, original 337-row snapshot result, and one observed UTM-bearing production Last Touch distinct. No production identifier-only census or lost-click estimate follows.

## Migration Plan

1. Review this companion change and the revised Magento coordination artifacts before UI implementation. Keep the existing accepted Magento classifier runtime unchanged.
2. Implement the bounded lists/tests/documentation and run focused plus required maintained/core checks in the current UI container. Regenerate/reload local config before live checks, preserving the Petsies brand/local backend and pre-existing submodule work.
3. Tester verifies synthetic initial ID-only landings with retained First Touch, queued reporting through local VSF API to local Magento, and browser context after shared responses/redirects. No ad-network click, real order, production access, or historical rewrite is required.
4. Merge, brand propagation and release remain separate authorized work. For a future approved rollout, make the accepted Magento AppLovin classifier available before publishing the expanded UI acquisition support, then validate each selected brand combination. No database migration is introduced.
5. A code rollback restores previous future capture/classification behavior only. It does not rewrite stored touches or recover dropped/overwritten context; any historical reclassification keeps Magento's existing creation-date eligibility and separate approval requirement.
