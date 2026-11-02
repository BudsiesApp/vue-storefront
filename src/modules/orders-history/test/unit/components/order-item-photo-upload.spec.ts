import { shallowMount } from '@vue/test-utils';

import {
  i18nInjectionKey,
  routerInjectionKey,
  storeInjectionKey
} from '@vue-storefront/core/application-services';

import OrderItemActions from '../../../components/order-item-actions.vue';

jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: jest.fn(() => jest.fn()) } }));
jest.mock('@vue-storefront/core/modules/cart', () => ({ IS_CART_SYNCING: 'cart/isSyncing' }));
jest.mock('@storefront-ui/vue', () => ({ SfButton: { name: 'SfButton', render: h => h('button') } }));
jest.mock('src/modules/shared', () => ({ FOREVERS_BUNDLE_SKUS: [] }));
jest.mock('theme/components/molecules/m-spinner-button.vue', () => ({ name: 'MSpinnerButton', render: h => h('button') }));
jest.mock('../../..', () => ({
  FETCH_ORDERS_HISTORY_ACTION: 'ordersHistory/FETCH_ORDERS_HISTORY',
  REORDER_ITEM_ACTION: 'ordersHistory/REORDER_ITEM',
  IS_REORDERING_ITEM: 'ordersHistory/isReorderingItem'
}));

const form = { name: 'PhotoForm', props: { orderItemId: { type: Number, required: true }, productSku: { type: String, required: true } }, render: h => h('div') };
const dispatch = jest.fn().mockResolvedValue(undefined);
const action = (code: string) => ({ code, name: '', message: code, blocking_progress: true, url: null, open_in_new_tab: false });
const photosMessage = "We're waiting for your photos. Please upload them here or send them by email.";
const orderItem = { item_id: 42, product: { sku: 'pet' }, extension_attributes: {} };

function mountActions (actionsList = [action('awaiting_artwork'), action('awaiting_customization')]) {
  return shallowMount(OrderItemActions, {
    propsData: { orderItem, actionsList, orderId: 1 },
    provide: {
      OrderItemPhotoUploadForm: form,
      [i18nInjectionKey as symbol]: { t: (key: string) => key },
      [routerInjectionKey as symbol]: { push: jest.fn() },
      [storeInjectionKey as symbol]: { dispatch, getters: {} }
    }
  });
}

function messages (wrapper: ReturnType<typeof mountActions>): string[] {
  return wrapper.findAll('._action-with-message').wrappers.map(message => message.text());
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('inline photo form in order item actions', () => {
  it('mounts the form only in the awaiting artwork block', () => {
    const wrapper = mountActions();
    const forms = wrapper.findAllComponents(form);
    expect(forms).toHaveLength(1);
    expect(forms.at(0).props()).toEqual({ orderItemId: 42, productSku: 'pet' });
    expect(forms.at(0).element.parentElement.textContent).toContain('awaiting_artwork');
  });

  it('keeps the API message while loading or ineligible', async () => {
    const wrapper = mountActions();
    expect(messages(wrapper)).toEqual(['awaiting_artwork', 'awaiting_customization']);
    wrapper.findComponent(form).vm.$emit('ready-changed', false);
    await wrapper.vm.$nextTick();
    expect(messages(wrapper)).toEqual(['awaiting_artwork', 'awaiting_customization']);
  });

  it('replaces only the awaiting artwork message once ready', async () => {
    const actionsList = [action('awaiting_artwork'), action('awaiting_customization')];
    const wrapper = mountActions(actionsList);
    wrapper.findComponent(form).vm.$emit('ready-changed', true);
    await wrapper.vm.$nextTick();
    expect(messages(wrapper)).toEqual([photosMessage, 'awaiting_customization']);
    expect(actionsList[0].message).toBe('awaiting_artwork');
  });

  it('refreshes the order history after submission', () => {
    const wrapper = mountActions();
    wrapper.findComponent(form).vm.$emit('submitted');
    expect(dispatch).toHaveBeenCalledWith('ordersHistory/FETCH_ORDERS_HISTORY', { filters: { excludeAlterationProducts: true } });
  });

  it('does not mount the form without awaiting artwork', () => {
    const wrapper = mountActions([action('awaiting_customization')]);
    expect(wrapper.findComponent(form).exists()).toBe(false);
  });
});
