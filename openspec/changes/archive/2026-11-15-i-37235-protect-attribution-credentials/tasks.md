# Tasks

Pending implementation of operator inputs 26/27 and P15. Earlier checked tasks/receipts remain historical in Git/ticket records, not acceptance of this revision. Apply the whole-PR disposition in `design.md`, preserving nonprivacy target changes, released Maestra support, local configuration and the user's payment-submodule difference. Live acceptance is tester-owned.

## 1. Remove superseded machinery

- [x] 1.1 Remove saved-load/cross-tab sanitization, the unused attribution/touch sanitizer, privacy-only extra query cloning and subscriber payload-to-state changes; restore existing mutations/storage/reporting flow without a new downstream filter, version marker or admission abstraction. Replace old-cleaning tests with concise unchanged saved-touch/cross-tab/report controls and ordinary lifecycle assertions.
- [x] 1.2 Remove the TaskQueue `logResponse` option, type/runtime/action changes and its suppression tests; restore privacy-only storage/report/module diagnostic changes and remove suppression-only tests. Retain existing queue results/rejections/transport, notifications and normal failure diagnostics. Do not sanitize or hide unchanged old task bodies; no arbitrary injected error string substitutes for actual fresh protected-value evidence.

## 2. Keep only fresh-input and real shared-output changes

- [x] 2.1 Retain the shared two-name predicate and ordinary-query URL helper at real fresh route/referrer capture; remove its unreachable fragment parser, legacy fragment test matrices and duplicate two-name configurable shipped/fallback additions. Verify actual shipped/fallback/custom-empty/configured-acquisition cases, referrer query carriers, normalized allowed values and unchanged live browser inputs. P9 full-URL fragment proof remains at Magento's fresh API boundary; do not invent alternate touch/hash/referrer-fragment ingress or change Maestra policy.
- [x] 2.2 Retain existing two-name page-cache split/clean rendering/current-request redirect handling. Replace only explicit SSR request-URL diagnostic arguments with the filtered URL; remove `ssr-diagnostics.ts`, generic error suppression and exception-hook request substitution. Update harness/tests to prove actual URL-log exclusion and preserved ordinary exception detail/containment, plus shared HTML/state/cache keys/values and current-request redirects in both orders, cache disabled, encoding/destination precedence and existing functional dimensions.

## 3. Continuity, documentation and validation

- [x] 3.1 Verify fresh captured data traverses real synchronization/commit/subscriber/cart reporting without re-filtering, while old saved/cross-tab data may persist/report unchanged. Retain First/Last ordering, expiry/success/failure/in-flight semantics, allowed paid/affiliate/Maestra context and the small actual auth/recovery consumer checks. Update README and tester handoff to remove legacy-cleaning/blanket diagnostic promises and distinguish normal Magento HTTP filtering from browser historical cleanup.
- [x] 3.2 Run focused capture/actions/storage/compatibility and applicable core SSR/cache/response suites separately, maintained/lint/build checks and strict OpenSpec validation through documented containers. Review the entire resulting PR diff against `design.md`'s disposition, report exact results/blockers and later actual theme/payment CI context, and hand off fixture-only browser/adapter/cache evidence without claiming prior old-scope acceptance or performing push/merge/deployment/historical operations.
