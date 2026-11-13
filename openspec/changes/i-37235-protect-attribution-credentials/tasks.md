# Tasks

## 1. Mandatory attribution filtering

- [x] 1.1 Add the small shared two-name predicate/URL-pair utility and attribution-copy sanitizer; verify focused synthetic tests for semantic names, one-layer URL decoding, duplicate/empty pairs, query-shaped fragments, allowed encoded context and caller-object immutability.
- [x] 1.2 Apply the mandatory exclusion in capture independently of configured sensitive lists, and update shipped/fallback lists and attribution README together; verify actual shipped-template, absent-config and custom-empty/configured-acquisition tests while preserving other override/gate/raw-value behavior.

## 2. Future state storage forwarding and diagnostics

- [x] 2.1 Sanitize independent copies at touch state ingress; persist post-mutation state and report from state getters. Verify real mutation, synchronization/storage-event, subscriber and reporting paths retain touch timestamps/flags/ordering and exclude credentials.
- [ ] 2.2 Replace unsafe arbitrary attribution storage/read/report reason serialization with non-disclosing operation diagnostics, and document prospective boundary handling rather than a storage sweep; verify injected-error logger spies, unsent-on-failure and cart/checkout nonblocking tests.

## 3. SSR representation and diagnostic isolation

- [ ] 3.1 Extend existing page-key/clean-render/stripped-query handling for the two protected semantic names only and document the current-request versus shared-data boundary; verify page-key and output-cache harness tests for visitor A/B/query-free in both orders, cold/hits, redirects/HTML, cache disabled, encoded/repeated names, destination precedence/fragments and unchanged functional/store dimensions.
- [ ] 3.2 Add the narrow safe diagnostic view to the identified SSR timing/cache/completion/error/final-failure and exception-hook boundaries; verify injected render/cache/output/cleanup/error-hook failures expose neither synthetic protected value, preserve original live requests and keep existing response containment and normal noncredential-request diagnostics.

## 4. Consumer compatibility and integrated validation

- [x] 4.1 Add maintained synthetic tests using the actual existing auth redirect consumer and recovery component with mocked transport; verify current-browser query, recovery key/promo instructions and existing flows remain available without a new provider-ticket consumer or any real credential/message.
- [ ] 4.2 Run focused attribution/storage suites, relevant core cache/response suites separately, required maintained/lint/build checks and strict OpenSpec validation in their documented environments; report actual results/blockers and the dynamically selected theme/payment CI context without changing submodule pointers.
- [ ] 4.3 Deliver the tester handoff from `design.md` for local browser/fixture-cache/cart-event/consumer compatibility verification and document any residual historical-data limits; verify it distinguishes planned acceptance from passing unit baselines, does not add Maestra acquisition/classification scope and introduces no cleanup/replay/notification/production operation.
