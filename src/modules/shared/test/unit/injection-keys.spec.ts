it('preserves all six injection keys across separate module registries', () => {
  let firstApplicationKeys: typeof import('@vue-storefront/core/application-services/injection-keys');
  let secondApplicationKeys: typeof import('@vue-storefront/core/application-services/injection-keys');
  let firstRequestKey: typeof import('@vue-storefront/core/request-services/injection-key');
  let secondRequestKey: typeof import('@vue-storefront/core/request-services/injection-key');
  let firstAdditionalContentKey: typeof import('@vue-storefront/core/additional-content/injection');
  let secondAdditionalContentKey: typeof import('@vue-storefront/core/additional-content/injection');

  jest.isolateModules(() => {
    firstApplicationKeys = require('@vue-storefront/core/application-services/injection-keys');
    firstRequestKey = require('@vue-storefront/core/request-services/injection-key');
    firstAdditionalContentKey = require('@vue-storefront/core/additional-content/injection');
  });

  jest.isolateModules(() => {
    secondApplicationKeys = require('@vue-storefront/core/application-services/injection-keys');
    secondRequestKey = require('@vue-storefront/core/request-services/injection-key');
    secondAdditionalContentKey = require('@vue-storefront/core/additional-content/injection');
  });

  expect(firstApplicationKeys.storeInjectionKey).toBe(secondApplicationKeys.storeInjectionKey);
  expect(firstApplicationKeys.routerInjectionKey).toBe(secondApplicationKeys.routerInjectionKey);
  expect(firstApplicationKeys.routeInjectionKey).toBe(secondApplicationKeys.routeInjectionKey);
  expect(firstApplicationKeys.i18nInjectionKey).toBe(secondApplicationKeys.i18nInjectionKey);
  expect(firstRequestKey.requestServicesInjectionKey).toBe(secondRequestKey.requestServicesInjectionKey);
  expect(firstAdditionalContentKey.additionalContentInjectionKey).toBe(secondAdditionalContentKey.additionalContentInjectionKey);
});
