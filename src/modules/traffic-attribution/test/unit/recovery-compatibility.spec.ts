import CartRecovery from 'theme/pages/CartRecovery.vue';

jest.mock('@vue-storefront/core/lib/multistore', () => ({ localizedRoute: jest.fn(route => route) }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: jest.fn(() => jest.fn()) } }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({
  __esModule: true, default: { $emit: jest.fn(), $off: jest.fn(), $on: jest.fn(), $once: jest.fn() }
}));
jest.mock('@storefront-ui/vue', () => ({ SfButton: {}, SfHeading: {} }));

it('preserves recovery inputs when the current route also carries protected names', async () => {
  const dispatch = jest.fn().mockResolvedValue('synthetic-cart');
  const view = {
    $route: { params: { id: 'fixture-id', code: 'fixture-code' },
      query: { applyPromoCode: 'true', password: 'synthetic', 'direct-crm-ticket': 'synthetic-two' } },
    $store: { commit: jest.fn(), dispatch }, $router: { push: jest.fn() }, isLoading: true, isShowError: false
  };
  await (CartRecovery as any).options.methods.recoverCart.call(view);
  expect(dispatch).toHaveBeenCalledWith('budsies/loadRecoverableCart', {
    recoveryId: 'fixture-id', recoveryCode: 'fixture-code', applyPromoCode: 'true'
  });
});
