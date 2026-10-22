# Design

## Context

See `proposal.md` for the failure and scope. `core/scripts/utils/ssr-renderer.ts` leaves `runInNewContext` unset. The server externals in `core/build/webpack.server.config.ts` include the package dependencies, sharing Vue, Vuex, Vue Router, and Vue I18n between render contexts. The Storyblok registration hook registers nine global component names on that shared Vue constructor, allowing a render to resolve a component loaded in another context.

The three key modules currently use `Symbol()`, so separate evaluations produce different identities. `injectRequired()` throws when injection returns `undefined`. `core/app.ts` already supplies all six values in the application's `provide` map; `createApplicationServiceProviders()` maps the four application-service keys to the supplied values. The failure requires changing key identity, not the provider construction or service values.

`src/modules/shared/test/unit/ssr-request-boundaries.spec.ts` uses `createRenderer()` within one module context. Its concurrent renders do not exercise independent key-module evaluations. `test/unit/jest.conf.js` discovers tests under `src/modules/**/test/unit/`, so the new test needs no configuration change.

## Goals / Non-Goals

**Goals:** Satisfy the `Cross-context injection contract` in `application-service-access` for all six keys, preserving the existing typed provider and consumer APIs.

**Non-Goals:** Changing `runInNewContext`, global component registration, `once()`, `Vue.prototype` data (`$cacheTags`, `$ssrRequestContext`), or themes. No new abstraction, helper, dependency, or configuration is needed. The lead owns the concurrent-request and Graylog checks outside this implementation task list.

## Decisions

### Use the global symbol registry for the existing keys

Replace only the six key initializers with `Symbol.for()` in their existing files. The shared registry preserves identity across independently evaluated modules; keeping `Symbol()` would reproduce the mismatch. Renderer and component-registration changes are excluded by the agreed scope.

Use these exact names:

| File | Export | Registry name |
| --- | --- | --- |
| `core/application-services/injection-keys.ts` | `storeInjectionKey` | `budsies.storefront.store` |
| `core/application-services/injection-keys.ts` | `routerInjectionKey` | `budsies.storefront.router` |
| `core/application-services/injection-keys.ts` | `routeInjectionKey` | `budsies.storefront.route` |
| `core/application-services/injection-keys.ts` | `i18nInjectionKey` | `budsies.storefront.i18n` |
| `core/request-services/injection-key.ts` | `requestServicesInjectionKey` | `budsies.storefront.request-services` |
| `core/additional-content/injection.ts` | `additionalContentInjectionKey` | `budsies.storefront.additional-content` |

The project prefix reduces accidental collisions with unrelated code using the registry. Distinct names preserve the separation between the six services.

### Preserve typed exports and application-owned values

Keep every exported name and its existing `InjectionKey<T>` annotation. This preserves type checking and all existing imports while changing only runtime identity; providers continue supplying their existing application values rather than introducing global service storage.

### Add exactly one identity regression test

Create `src/modules/shared/test/unit/injection-keys.spec.ts` with one test case. In each of two separate `jest.isolateModules()` callbacks, load the three key modules directly and capture the six exported keys; outside the callbacks, assert each corresponding pair with `toBe()`.

Separate registries force module reevaluation and expose the identity mismatch that ordinary imports and the existing single-context render test miss. This test covers the selected failure mechanism without adding renderer fixtures, browser tests, or another request-isolation test.

### Keep one specification contract

Define the cross-context behavior for all six keys once in `application-service-access`. A single contract keeps the requirement and its scenarios aligned without redundant capability deltas.

## Risks / Trade-offs

- Global registry names could collide with another caller using the identical string → use the explicit project-prefixed names above.
- The new unit test verifies module identity, not the full concurrent SSR renderer → retain existing service and request-boundary coverage and run both required unit suites; the lead handles the separate runtime checks.

## Migration Plan

The app code follows the normal release and branch propagation path, including the merge from `petsies-theme` to `bulkorders-theme`. No data migration or theme release is needed. Reverting the three initializer edits restores the previous key creation behavior if rollback is required.
