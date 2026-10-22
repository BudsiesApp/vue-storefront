# Tasks

## 1. Stabilize injection keys and cover module reevaluation

- [ ] 1.1 Update the four initializers in `core/application-services/injection-keys.ts` to `Symbol.for()` using `budsies.storefront.store`, `budsies.storefront.router`, `budsies.storefront.route`, and `budsies.storefront.i18n`; verify the diff preserves all exported names and `InjectionKey<T>` annotations.
- [ ] 1.2 Update `requestServicesInjectionKey` in `core/request-services/injection-key.ts` to `Symbol.for('budsies.storefront.request-services')`; verify the exported name and `InjectionKey<RequestServices>` annotation are preserved.
- [ ] 1.3 Update `additionalContentInjectionKey` in `core/additional-content/injection.ts` to `Symbol.for('budsies.storefront.additional-content')`; verify the exported name and `InjectionKey<AdditionalContentRegistry>` annotation are preserved.
- [ ] 1.4 Add exactly one test case in `src/modules/shared/test/unit/injection-keys.spec.ts`: load all three key modules in each of two separate `jest.isolateModules()` callbacks and assert all six corresponding keys with `toBe()`.

## 2. Validate the complete change

- [ ] 2.1 Run `yarn lint` and verify it exits successfully.
- [ ] 2.2 Run `yarn type-check` and verify it exits successfully.
- [ ] 2.3 Run `yarn test:unit:maintained` and verify it exits successfully, including the single new regression case.
- [ ] 2.4 Run `yarn test:unit:core` and verify it exits successfully.
- [ ] 2.5 Run `openspec validate i-37142-ssr-injection-keys --strict` and verify it reports the change as valid.
