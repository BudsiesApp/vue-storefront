# Design

## Context

See `proposal.md` for motivation and `specs/digital-portrait-downloads/spec.md` for behavior. The ticket files are saved evidence, not live observations. The page currently strips a path segment for preview/related-product links, leaves filename-only previews relative, and downloads the unmodified storage path without catching failure. The shared downloader resolves an original URL, fetches it, rejects non-OK responses, and saves/revokes a blob URL.

Theme source/tests belong to the separate `src/themes/petsies-capybara` repository; specs belong to UI `openspec/`. Both branches are `37162-fix-digital-portrait-downloads`. Comparison bases are UI `17894f10295bf396e177b2762eaafc7732a45868` and theme `ce28a4ccf1e2e71c5bcac535286d12ea162602e3`.

## Goals / Non-Goals

**Goals:** Correct portrait selection and recoverable feedback locally, retaining the shared downloader and global image-service contracts.

**Non-Goals:** New service APIs, production test seams, persistent state, runtime configuration, authorization machinery, or retry policies. Business exclusions remain in the proposal.

## Decisions

### Normalize only at the portrait page boundary

Add a small setup-local `getPortraitImagePath(path)` operation that removes one exact leading `budsies-qa-photos/` and otherwise preserves the input. Reuse it in the existing `getAbsoluteImageUrl()` and before `downloadImage()` in `downloadDeliverable()`. The URL function always resolves through the injected QA handler, including filename-only inputs; retain its preview and related-product callers and the existing order-item download filename.

This shares the correction without broadening `useImageDownload()` or `ImageHandlerService`. Passing a resolved URL to the current downloader would prepend the host twice. Do not sanitize arbitrary segments or infer unsupported formats. The configured QA handler base remains authoritative; no ticket hostname is hardcoded.

### Reuse the notification boundary

Catch the awaited download failure and dispatch `notification/spawnNotification` with `type: 'danger'`, translated `Something went wrong`, and translated `OK`. Obtain services through `useStore()`/`useI18n()` from `core/application-services`. These keys already exist in `resource/i18n/en-US.csv`; the shape follows printout notifications and the access pattern follows `use-bulk-images-upload.ts`.

Leave fetch-error state and the available deliverables unchanged. The downloader retains no failed-attempt state, so another click can succeed without a new busy flag, automatic retry, delay, timeout, or cap.

### Mount the existing component and give each regression a distinct purpose

[Theme coding standards](/home/andre/projects/budsies/store-ui/ui-app/src/themes/petsies-capybara/CODING_STANDARDS.md:13) inherit UI lint rules and keep pages under `pages/`. They do not prescribe a test API. Use the verified [mountWithApplicationServices API](/home/andre/projects/budsies/store-ui/ui-app/test/unit/utils/application-services.ts:13): `(component, services, mountOptions = {})` calls Vue Test Utils `mount()`, forwards mount options, and merges `mountOptions.provide` after application-service providers. Supply `{ store, router, route, i18n }` as services and use the third argument for `propsData.orderItemId`, `provide.QaPhotosHandlerService`, child stubs, and template mocks. No exported setup function, altered injection contract, or test-only production seam is needed.

Use the real shared downloader in page tests, with synthetic data and mocked fetch/blob URL/anchor APIs. Destroy wrappers and restore mocks. Coverage ownership is:

| Test location | Distinct scenario and assertions |
| --- | --- |
| `pages/OrderItemDeliverablesDownload.spec.ts` | Prefixed and filename-only records: preview/download select the same configured-host original; related-product queries retain the first portrait and existing route/product selection. Exercise another synthetic configured base without multiplying every case by host. Verify the portrait filename, blob save, anchor cleanup, and URL revocation in this successful flow. |
| Same page spec | Exact-prefix boundary: a near-match and a nonleading occurrence pass through unchanged. No matrix of arbitrary unsupported URL formats. |
| Same page spec | HTTP 403, HTTP 404, and network rejection, each followed by success on the same mount: notification, no failed-response save, available Download, fresh request, successful save/cleanup, and no new failure notification on success. These cases own failure/recovery coverage. |
| `helpers/use-image-download.spec.ts` | One separate printout-caller success contract: its raw storage input reaches its handler unchanged, its resolved original is saved with the supplied filename, and the temporary URL is revoked. No helper failure/network/save-throws cases. |
| Source/base review | Existing authenticated route/guard, token/order-item GET contract, non-200 rejection, and page unavailable state remain unchanged. This does not assert backend ownership enforcement. |

## Validation execution

Follow the [local-development skill](/home/andre/.agents/skills/budsies-store-dev-environment/SKILL.md): VSF Yarn runs in its container. The reported host Node is `24.15.0`; `package.json` requires Node `24.17.0` and Yarn `4.17.1`. No UI Compose services currently run. Use CLI base `docker` and Compose base `docker compose`.

`docker-compose.yml` defines the tests image `472532368511.dkr.ecr.us-east-1.amazonaws.com/budsies.com/store/ui/dev/tests:2026-10-22.13.1` and source mount `.:/var/www`. `docker/tests/Dockerfile` verifies the required versions, sets `/var/www`, and has a default CMD that installs e2e dependencies. Bypass that CMD. If a tests container is already running in a future session, use `docker compose exec -T -w /var/www tests corepack yarn ...`. With no services running, use a one-shot equivalent from the UI root:

```bash
docker run --rm --pull=never --network=none --user "$(id -u):$(id -g)" --mount "type=bind,src=$PWD,dst=/var/www" --workdir /var/www --entrypoint corepack 472532368511.dkr.ecr.us-east-1.amazonaws.com/budsies.com/store/ui/dev/tests:2026-10-22.13.1 yarn --version
```

Verify Node with the same invocation using `--entrypoint node` and `--version`. Run each Yarn payload in `tasks.md` by replacing the final `yarn --version` arguments above with that payload. For production-mode lint, add `--env NODE_ENV=production` before the image. This uses the existing image and source mount without application startup, e2e installation, app/redis, or runtime/config generation. If Docker, the local image, required versions, mounted dependencies, or permissions are unavailable, report the exact failing command/output as a blocker. Do not pull/build a replacement, relax engines, fabricate environment config, or start services to work around it.

Focused Jest and narrow lint precede the implementation commit. Full maintained/core suites, type-check, configuration-lifecycle assertions, and full lint run in a separate routine test session after that commit; failures are compared with the recorded base pair using the same container/toolchain and dependency state. Full suites are not a pre-commit prerequisite. Before archive, record routine results and distinguish existing failures from regressions.

`test/unit/jest.conf.js` discovers theme specs and uses jsdom/TS/Vue transforms; `tsconfig.vue-tsc.json` excludes specs, so type-check does not replace Jest. CI actively runs maintained tests, configuration assertions, lint, and build; core is disabled and type-check is not an explicit CI step. `test/upgrade/configuration-lifecycle.js` checks source text without generating runtime config. The existing CI build remains a release gate outside this local validation session.

## Risks / Trade-offs

- [Other handler bases or storage forms exist] → Use the injected service and only the demonstrated prefix operation; leave other path content intact.
- [A supported validation image/toolchain is unavailable] → Report its exact blocker; no host-engine or configuration workaround.
- [Mocks cannot prove a saved image opens on a real device] → Retain the post-deployment acceptance below.

## Migration and acceptance

No data/configuration migration is needed. Theme source/tests commit separately from UI artifacts and a subsequent theme gitlink update. Preserve the Braintree mismatch, untracked documents, stashes, and branches. Rollback restores the prior theme revision and matching UI gitlink.

Post-deployment acceptance, **not run in this implementation workflow**: after separately authorized release/access, verify authenticated Petsies desktop/mobile downloads for order `3000144093`, portraits `5258551` and `5258557`; open each full-size image and compare with its preview. This is outside tracked implementation tasks and does not block archive.

## Sources and existing contracts

- Saved evidence: `/home/andre/projects/budsies/task-management/tickets/37162-digital-portrait-downloads/issue.md` and `issue-source.json`.
- Behavior: theme `pages/OrderItemDeliverablesDownload.vue`, `helpers/use-image-download.ts`, `pages/OrderPrintoutsDownload.vue`, `helpers/use-bulk-images-upload.ts`, `App.vue`, `router/index.js`, and `resource/i18n/en-US.csv`; UI `src/modules/file-storage/image-handler.service.ts`, `src/modules/customization-system/helpers/order-items-customizations.service.ts`, `core/modules/url/router/beforeEach.ts`, and `core/lib/sync/task.ts`.
- Test/tooling: linked theme standards and mount API; `core/application-services/types.ts`, `test/unit/setupTestEnvironment.ts`, `test/unit/jest.conf.js`, nearby theme `pages/MyAccount.spec.ts`/`pages/CartRecovery.spec.ts`, `package.json`, `eslint.config.js`, `tsconfig.vue-tsc.json`, `docker-compose.yml`, `docker/tests/Dockerfile`, `test/upgrade/configuration-lifecycle.js`, and `.github/workflows/test_vsf1.yml`.
- Existing specs/archive reviewed: `application-service-access` and archived `2026-07-27-i-36838-replace-vue-instance-service-access`/`2026-10-22-i-37142-ssr-injection-keys` preserve explicit app services; `order-history-item-reorder-feedback` and archived `2026-08-07-i-36598-add-order-item-reorder-loading-indicator` concern reorder feedback; `storyblok-asset-delivery` concerns a different asset source. No existing local portrait capability or archived decision for #35577/#36132/#37143 was found. Those contracts remain unchanged.
