# Tasks

## 1. Existing acquisition and reporting owners

- [x] 1.1 Add the documented click marker to shipped/fallback acquisition defaults and the narrow nonblank eligibility check while preserving replacement overrides/raw values; verify actual-template and absent-config tests for nonempty/empty/null/whitespace/case/key-only/custom-empty/omitted-marker cases alongside existing acquisition controls. Update the attribution README with supported-key/override and no standalone key-marker/channel inference policy.
- [x] 1.2 Add actual action/storage/reporting regressions for retained Google First Touch, a different marker-only initial Last Touch, first-capture initialization and subsequent cart-event queued body/sent/failure/in-flight semantics. Verify raw labels, origin/path-only landing, touch metadata, client-only timing and existing sensitive filtering remain intact; document initial-only capture/report triggers without adding state/transport/API machinery.

## 2. Existing SSR isolation and current-request context

- [x] 2.1 Add only lowercase `m-message-click-id` to the current exact-name ignored-key pipeline; verify page-key and full output-cache/response harness tests for two visitors/query-free in both orders, cold/hits, cache disabled, whole HTML/state/cache entry exclusion, significant/store/A-B dimensions and unchanged other/key-only/case policies. Document the distinction from case-insensitive acquisition matching.
- [x] 2.2 Extend fresh/cached redirect and browser-context harness tests for original encoded/repeated pairs, destination-key collisions, fragment placement and query-free-first/parameterized-first continuity; verify cached entries remain clean and current-browser inputs plus existing auth/recovery interfaces are preserved without a second stripper or live URL mutation.

## 3. Integrated checks and publication handoff

- [ ] 3.1 Run focused attribution/actions/storage tests and relevant core page/cache/response tests separately, then required maintained/lint/build and strict OpenSpec checks through documented containers; report exact results/blockers and actual dynamically selected theme/payment CI context without changing submodule pointers or installing a new dependency.
- [x] 3.2 Deliver the tester handoff from `design.md` for synthetic return acquisition, shared HTML/cache/redirect/browser evidence and a real local cart event through the existing API to accepted Magento. Verify the README records Magento acceptance before expanded UI publication only, later brand propagation and the separation of synthetic proof from provider/historical/production claims.
