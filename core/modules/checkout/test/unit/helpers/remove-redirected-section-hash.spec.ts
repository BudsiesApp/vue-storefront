import { removeRedirectedSectionHash } from '@vue-storefront/core/modules/checkout/helpers/remove-redirected-section-hash.function';

function createRouter (currentRoute: Record<string, unknown>) {
  return {
    currentRoute: { path: '/checkout/cart/', query: {}, hash: '', ...currentRoute },
    replace: jest.fn()
  } as any;
}

describe('removeRedirectedSectionHash', () => {
  it('removes a Checkout section hash and keeps the path and query', () => {
    const router = createRouter({ hash: '#shipping', query: { utm_source: 'review' } });

    removeRedirectedSectionHash(router);

    expect(router.replace).toHaveBeenCalledWith(
      { path: '/checkout/cart/', query: { utm_source: 'review' } },
      undefined,
      expect.any(Function)
    );
  });

  it('keeps an unrelated hash', () => {
    const router = createRouter({ hash: '#main-content' });

    removeRedirectedSectionHash(router);

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('does nothing without a hash', () => {
    const router = createRouter({});

    removeRedirectedSectionHash(router);

    expect(router.replace).not.toHaveBeenCalled();
  });
});
