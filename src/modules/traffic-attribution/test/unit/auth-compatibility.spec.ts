import { shallowMount } from '@vue/test-utils';
import { useAuthorizationPage } from 'theme/helpers/use-authorization-page';

const route = { query: { password: 'synthetic', 'direct-crm-ticket': 'synthetic-two', utm_source: 'allowed' } };
const replace = jest.fn();
jest.mock('@vue-storefront/core/application-services', () => ({
  useRoute: () => route,
  useRouter: () => ({ replace }),
  useStore: () => ({ getters: { 'user/isLoggedIn': true } })
}));

it('keeps current-browser query available to the existing authorization redirect consumer', () => {
  shallowMount({ setup: useAuthorizationPage, render: h => h('div') });
  const target = replace.mock.calls[0][0];
  const query = new URL(target, 'https://example.test').searchParams;
  expect(query.get('password')).toBe('synthetic');
  expect(query.get('direct-crm-ticket')).toBe('synthetic-two');
  expect(query.get('utm_source')).toBe('allowed');
});
