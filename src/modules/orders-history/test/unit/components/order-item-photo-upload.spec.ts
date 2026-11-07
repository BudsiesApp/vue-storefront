import { shallowMount } from '@vue/test-utils';

import {
  i18nInjectionKey,
  routerInjectionKey,
  storeInjectionKey
} from '@vue-storefront/core/application-services';

import { Logger } from '@vue-storefront/core/lib/logger';

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

const form = {
  name: 'PhotoForm',
  props: { orderItemId: { type: Number, required: true }, productSku: { type: String, required: true } },
  render (h) {
    const alternative = this.$scopedSlots['alternative-action'];
    return h('div', { class: 'photo-form' }, alternative ? [h('div', { class: 'photo-form-alternative' }, alternative())] : []);
  }
};
const dispatch = jest.fn().mockResolvedValue(undefined);
const action = (code: string) => ({ code, name: '', message: code, blocking_progress: true, url: null, open_in_new_tab: false });
const orderItem = { item_id: 42, product: { sku: 'pet' }, extension_attributes: {} };

function mountActions (actionsList = [action('awaiting_artwork'), action('awaiting_customization')], injectForm = true, item = orderItem) {
  return shallowMount(OrderItemActions, {
    propsData: { orderItem: item, actionsList, orderId: 1 },
    provide: {
      ...(injectForm ? { OrderItemPhotoUploadForm: form } : {}),
      [i18nInjectionKey as symbol]: { t: (key: string) => key },
      [routerInjectionKey as symbol]: { push: jest.fn() },
      [storeInjectionKey as symbol]: { dispatch, getters: {} }
    }
  });
}

const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

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

  it('hides only the generic awaiting artwork prompt once the form is ready', async () => {
    const actionsList = [action('awaiting_artwork'), action('awaiting_customization')];
    const wrapper = mountActions(actionsList);
    wrapper.findComponent(form).vm.$emit('ready-changed', true);
    await wrapper.vm.$nextTick();
    expect(messages(wrapper)).toEqual(['awaiting_customization']);
    expect(wrapper.text()).not.toContain("We're waiting for your photos.");
    expect(wrapper.findAllComponents(form)).toHaveLength(1);
    expect(actionsList[0].message).toBe('awaiting_artwork');
  });

  it('marks the photo panel only while the form is ready', async () => {
    const wrapper = mountActions();
    expect(wrapper.classes()).not.toContain('-photo-panel');
    expect(wrapper.findAll('._action-with-message-container.-photo-panel')).toHaveLength(0);
    wrapper.findComponent(form).vm.$emit('ready-changed', true);
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).toContain('-photo-panel');
    expect(wrapper.findAll('._action-with-message-container.-photo-panel')).toHaveLength(1);
    wrapper.findComponent(form).vm.$emit('ready-changed', false);
    await wrapper.vm.$nextTick();
    expect(wrapper.classes()).not.toContain('-photo-panel');
    expect(messages(wrapper)).toEqual(['awaiting_artwork', 'awaiting_customization']);
  });

  it('keeps the backend message and action when the form is not injected', async () => {
    const wrapper = mountActions([{ ...action('awaiting_artwork'), url: 'https://example.test/send' }], false);
    await wrapper.vm.$nextTick();
    expect(messages(wrapper)).toEqual(['awaiting_artwork']);
    expect(wrapper.find('a._available-action').attributes('href')).toBe('https://example.test/send');
    expect(wrapper.classes()).not.toContain('-photo-panel');
  });

  it('forwards a real alternative action into the form slot and hides the generic one when ready', async () => {
    const alternative = { ...action('awaiting_artwork'), name: 'Send by email', url: 'https://example.test/send', open_in_new_tab: true };
    const wrapper = mountActions([alternative]);
    expect(wrapper.findAll('a._available-action')).toHaveLength(1);
    wrapper.findComponent(form).vm.$emit('ready-changed', true);
    await wrapper.vm.$nextTick();
    const link = wrapper.findComponent(form).find('a');
    expect(wrapper.findAll('a')).toHaveLength(1);
    expect(link.attributes('href')).toBe('https://example.test/send');
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('aria-label')).toBe('{action}: {item} opens in new tab');
    expect(link.text()).toBe('Send by email');
  });

  it('does not invent an alternative action when the API supplies no URL', async () => {
    const wrapper = mountActions();
    wrapper.findComponent(form).vm.$emit('ready-changed', true);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(form).find('a').exists()).toBe(false);
    expect(wrapper.find('a').exists()).toBe(false);
  });

  it('keeps unrelated actions intact beside the ready panel', async () => {
    const reorder = { ...action('re-order'), name: 'Re-order', message: '', blocking_progress: false };
    const support = { ...action('contact_support'), name: 'Contact Support', message: '', blocking_progress: false, url: 'https://example.test/support' };
    const wrapper = mountActions([action('awaiting_artwork'), action('awaiting_customization'), reorder, support]);
    wrapper.findComponent(form).vm.$emit('ready-changed', true);
    await wrapper.vm.$nextTick();
    expect(messages(wrapper)).toEqual(['awaiting_customization']);
    expect(wrapper.find('._available-actions a').attributes('href')).toBe('https://example.test/support');
    expect(wrapper.findAll('._available-actions ._available-action')).toHaveLength(2);
  });

  it('does not share readiness between items', async () => {
    const first = mountActions();
    const second = mountActions(undefined, true, { ...orderItem, item_id: 43 });
    first.findComponent(form).vm.$emit('ready-changed', true);
    await first.vm.$nextTick();
    expect(messages(first)).toEqual(['awaiting_customization']);
    expect(messages(second)).toEqual(['awaiting_artwork', 'awaiting_customization']);
    expect(second.findComponent(form).props()).toEqual({ orderItemId: 43, productSku: 'pet' });
  });

  it('refreshes the order history after submission', () => {
    const wrapper = mountActions();
    wrapper.findComponent(form).vm.$emit('submitted');
    expect(dispatch).toHaveBeenCalledWith('ordersHistory/FETCH_ORDERS_HISTORY', { filters: { excludeAlterationProducts: true } });
  });

  it('replaces the awaiting artwork prompt with the form confirmation at once while the refresh is slow', async () => {
    let finishRefresh: () => void;
    dispatch.mockImplementationOnce(() => new Promise<void>(resolve => { finishRefresh = resolve; }));
    const wrapper = mountActions();
    wrapper.findComponent(form).vm.$emit('ready-changed', true);
    wrapper.findComponent(form).vm.$emit('submitted');
    await wrapper.vm.$nextTick();
    expect(messages(wrapper)).toEqual(['awaiting_customization']);
    expect(wrapper.findComponent(form).exists()).toBe(true);
    finishRefresh();
    await flush();
    expect(messages(wrapper)).toEqual(['awaiting_customization']);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('keeps the submitted state when a refresh still returns the awaiting artwork action', async () => {
    const wrapper = mountActions();
    wrapper.findComponent(form).vm.$emit('submitted');
    await flush();
    await wrapper.setProps({ actionsList: [action('awaiting_artwork'), action('awaiting_customization')] });
    expect(wrapper.findComponent(form).exists()).toBe(true);
    expect(messages(wrapper)).toEqual(['awaiting_customization']);
  });

  it('removes the form once a refresh no longer returns the awaiting artwork action', async () => {
    const wrapper = mountActions();
    wrapper.findComponent(form).vm.$emit('submitted');
    await flush();
    await wrapper.setProps({ actionsList: [action('awaiting_customization')] });
    expect(wrapper.findComponent(form).exists()).toBe(false);
    expect(messages(wrapper)).toEqual(['awaiting_customization']);
  });

  it('logs a failed refresh and shows a non-blocking notice without reviving the prompt', async () => {
    const failure = new Error('refresh failed');
    dispatch.mockRejectedValueOnce(failure);
    const wrapper = mountActions();
    wrapper.findComponent(form).vm.$emit('submitted');
    await flush();
    expect(Logger.error).toHaveBeenCalledWith(failure, 'order-history');
    expect(dispatch).toHaveBeenLastCalledWith('notification/spawnNotification', {
      type: 'warning',
      message: "Your photos were submitted, but we couldn't refresh the order status. Please refresh the page to see the latest status.",
      action1: { label: 'OK' }
    });
    expect(wrapper.findComponent(form).exists()).toBe(true);
    expect(messages(wrapper)).toEqual(['awaiting_customization']);
  });

  it('does not mount the form without awaiting artwork', () => {
    const wrapper = mountActions([action('awaiting_customization')]);
    expect(wrapper.findComponent(form).exists()).toBe(false);
  });
});
