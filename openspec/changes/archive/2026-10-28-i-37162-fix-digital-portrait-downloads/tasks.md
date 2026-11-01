# Tasks

Theme source/tests belong to `src/themes/petsies-capybara`; UI owns OpenSpec artifacts. Execute every Yarn payload below through the existing tests container or the one-shot `docker` invocation in `design.md`, from `/var/www`. For one-shot runs, replace its final `yarn --version` with the listed payload; use `--env NODE_ENV=production` for lint. Do not execute Yarn on the Node `24.15.0` host.

## 1. Focused implementation and handoff

- [x] 1.1 Verify the existing tests image is locally available and its container reports Node `24.17.0`/Yarn `4.17.1`, with mounted dependencies accessible. Use the image/source mount and entrypoint override in design; no app/redis or config generation. If unavailable, record the exact failing command/output as a blocker without an engine/configuration workaround.
- [x] 1.2 Add `pages/OrderItemDeliverablesDownload.spec.ts` using `mountWithApplicationServices(component, services, mountOptions)` with the QA handler in the third argument's `provide`, props, mocks, and child stubs. Use the real downloader. Map cases to the spec's prefixed/filename-only original, preview agreement, related-product selection, configured-host, and exact-prefix scenarios; combine assertions for the same input rather than duplicate paths. Limit boundary negatives to a near-match and a nonleading prefix occurrence. Verify the expected current-source failures with focused Jest.
- [x] 1.3 In the page spec, add HTTP 403, HTTP 404, and network rejection cases, each followed by success on the same mount. Verify localized error/OK feedback, no failed-response save, retained available deliverables/Download, fresh successful request without reload, blob/anchor cleanup, and no new failure notification on success. All transport/browser APIs are mocked; verify missing-feedback assertions fail before implementation.
- [x] 1.4 Add one `helpers/use-image-download.spec.ts` success regression for the separate printout caller's unmodified handler input, supplied filename, and temporary-URL cleanup. Verify it passes on the unchanged helper. Failure/network/recovery/save coverage belongs to the real-downloader page tests; do not duplicate it here.
- [x] 1.5 Implement the page-local exact-prefix operation and existing notification approach in design. Keep shared production helpers, the global `ImageHandlerService`, and the mount API unchanged; add no test-only production seam. Verify both focused files pass, including original portrait selection, successful blob save/cleanup and all failure-then-success cases; restore mocks and destroy wrappers.
- [x] 1.6 Run narrow production-mode lint and review source/base diffs for unchanged `meta.auth`, `user/isLoggedIn` guard/return destination, TaskQueue token/order-item GET/non-200 contract, page fetch/unavailable branch, printout caller, and product selection/click behavior. Compare with the UI/theme bases in design, preserving unrelated state. Hand off exact implementation revisions, focused command/results, and any blocker to the separate routine test session. Full suites are not required before the implementation commit.

Focused Jest payload (select only the relevant file while adding tests):

```bash
yarn test:unit --runInBand --runTestsByPath src/themes/petsies-capybara/pages/OrderItemDeliverablesDownload.spec.ts src/themes/petsies-capybara/helpers/use-image-download.spec.ts
```

Narrow lint payload, with container `NODE_ENV=production`:

```bash
yarn exec eslint src/themes/petsies-capybara/pages/OrderItemDeliverablesDownload.vue src/themes/petsies-capybara/pages/OrderItemDeliverablesDownload.spec.ts src/themes/petsies-capybara/helpers/use-image-download.spec.ts
```

## 2. Separate routine test session after implementation commit

- [x] 2.1 Run the complete maintained and core suites using the container payloads below. Record exact implementation revisions, commands, exits, discovery of the new theme specs, and any failures. Core still runs here despite being disabled in CI.
- [x] 2.2 In the same supported container, run type-check, full production-mode lint, and the configuration-lifecycle assertions below; record each outcome. The configuration test reads source without generating runtime configuration. Type-check excludes specs and does not replace focused Jest.
- [x] 2.3 Compare remaining failures against UI `17894f10295bf396e177b2762eaafc7732a45868` and theme `ce28a4ccf1e2e71c5bcac535286d12ea162602e3` with identical container/toolchain/dependencies in an isolated checkout, preserving working branches/stashes and the Braintree mismatch. Separate existing failures from regressions and resolve introduced failures; if all pass, record that no comparison was needed. Review final scope and run `openspec validate i-37162-fix-digital-portrait-downloads --strict` successfully before archive; include routine results and the production acceptance status in the handoff.

Routine container payloads (run separately; set container `NODE_ENV=production` for lint):

```bash
yarn test:unit:maintained --runInBand
yarn test:unit:core --runInBand
yarn type-check
yarn lint
yarn test:upgrade:config
```

## Workflow follow-up

- Theme source/tests commit separately from UI artifacts and any later theme gitlink update. Preserve existing CI gates, including the release build; application startup/config generation is outside this local test session.
- Post-deployment acceptance: **not run in this implementation workflow**. After separately authorized deployment/access, verify authenticated desktop/mobile download/open/preview agreement for order `3000144093`, portraits `5258551` and `5258557`. This is outside tracked implementation progress and does not block archive.
