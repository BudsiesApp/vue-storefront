import { mount } from '@vue/test-utils';
import CartItem from 'core/modules/cart/types/CartItem';
import { getCartItemOptions } from 'theme/helpers/get-cart-item-options.function';
import Configuration from 'src/modules/customization-system/components/cart-item-configuration.vue';

jest.mock('@storefront-ui/vue', () => ({
  SfProperty: {
    props: { name: String, value: [String, Number] },
    render (h) {
      return h('div', [this.name, ' ', String(this.value)]);
    }
  },
  SfIcon: { render: (h) => h('span') }
}));

jest.mock('@vue-storefront/core/helpers', () => ({ onlineHelper: { isOnline: true } }));

jest.mock('src/modules/shared', () => ({ useMobileObserver: () => ({ isMobile: { value: false } }) }));
jest.mock('src/modules/customization-system', () => ({ useEstimatedShipment: () => ({}) }));


function options (value: string) {
  return getCartItemOptions({
    custom_options: [{ title: 'Hospital name' }],
    totals: { options: [{ label: 'Hospital name', value }] }
  } as unknown as CartItem);
}

describe('fallback option text', () => {
  it.each([
    ['Children&#039;s Hospital of Atlanta', "Children's Hospital of Atlanta"],
    ['&lt;img src=x onerror=alert(1)&gt;', '<img src=x onerror=alert(1)>']
  ])('renders %s as inert text', (value, expected) => {
    const wrapper = mount(Configuration, {
      propsData: { productOptions: options(value) },
      stubs: { SfIcon: true },
      mocks: { $t: (key: string) => key }
    });
    expect(wrapper.text()).toContain('Hospital name');
    expect(wrapper.text()).toContain(expected);
    expect(wrapper.find('img').exists()).toBe(false);
    wrapper.destroy();
  });

});
