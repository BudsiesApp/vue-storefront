# Proposal

## Why

Concurrent SSR requests intermittently fail with `Missing application service provider` because a component loaded in another render context uses different `Symbol()` injection keys from the current application's providers. Redmine #37142 requires stable key identity while consumers continue receiving the current application's services.

## What Changes

- Create the six existing injection keys with project-prefixed `Symbol.for()` names, retaining their exported names and `InjectionKey<T>` types.
- Specify one cross-context service access contract in `application-service-access` for all six keys.
- Add one regression unit test loading all three key modules in two separate `jest.isolateModules` registries and comparing all six symbols by identity.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `application-service-access`: Own the cross-context key identity and current-application service lookup contract for store, router, route, i18n, request services, and Additional Content.

## Impact

Implementation is limited to `core/application-services/injection-keys.ts`, `core/request-services/injection-key.ts`, `core/additional-content/injection.ts`, and one new test at `src/modules/shared/test/unit/injection-keys.spec.ts`. No new dependencies, helpers, configuration, or public API signatures are required.

The lead has verified the five brand theme branches and the matching six keys on `bulkorders-theme`; no theme changes are needed, and the app change reaches Bulk Orders through the normal merge from `petsies-theme`. Renderer settings, global component registration, `once()`, and `Vue.prototype` request data are outside this change.
