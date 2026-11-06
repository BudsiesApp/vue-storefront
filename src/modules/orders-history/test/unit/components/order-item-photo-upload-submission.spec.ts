import { mount } from '@vue/test-utils';

import {
  i18nInjectionKey,
  routerInjectionKey,
  storeInjectionKey
} from '@vue-storefront/core/application-services';
import {
  fetchOrderItemCustomizationsState,
  saveOrderItemCustomizationsState,
  submitOrderItemCustomizationsState
} from 'src/modules/customization-system';
import OrderItemPhotoUploadForm from 'theme/components/customization-system/forms/order-item-photo-upload-form.vue';

import OrderItemActions from '../../../components/order-item-actions.vue';

jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: jest.fn(() => jest.fn()) } }));
jest.mock('@vue-storefront/core/modules/cart', () => ({ IS_CART_SYNCING: 'cart/isSyncing' }));
jest.mock('@storefront-ui/vue', () => ({
  SfButton: { name: 'SfButton', render (h) { return h('button', { on: { click: () => this.$emit('click') } }, this.$slots.default); } }
}));
jest.mock('src/modules/shared', () => ({ FOREVERS_BUNDLE_SKUS: [] }));
jest.mock('theme/components/molecules/m-spinner-button.vue', () => ({
  name: 'MSpinnerButton',
  props: { disabled: Boolean, showSpinner: Boolean },
  render (h) {
    return h('button', { class: { '-spinner': this.showSpinner }, attrs: { disabled: this.disabled }, on: { click: () => this.$emit('click') } }, this.$slots.default);
  }
}));
jest.mock('theme/components/customization-system/customization-option.vue', () => ({ name: 'CustomizationOption', render: h => h('div') }));
jest.mock('vee-validate', () => ({
  ValidationObserver: { name: 'ValidationObserver', methods: { validate: () => Promise.resolve(true) }, render (h) { return h('div', this.$slots.default); } }
}));
jest.mock('../../..', () => ({
  FETCH_ORDERS_HISTORY_ACTION: 'ordersHistory/FETCH_ORDERS_HISTORY',
  REORDER_ITEM_ACTION: 'ordersHistory/REORDER_ITEM',
  IS_REORDERING_ITEM: 'ordersHistory/isReorderingItem'
}));
jest.mock('src/modules/customization-system', () => ({
  ...jest.requireMock('src/modules/customization-system/helpers/order-items-customizations.service'),
  ...jest.requireActual('src/modules/customization-system/composables/use-customization-state'),
  ...jest.requireActual('src/modules/customization-system/composables/use-entity-busy-state'),
  ...jest.requireActual('src/modules/customization-system/helpers/filter-customization-state'),
  ...jest.requireActual('src/modules/customization-system/types/widget-type'),
  ...jest.requireActual('src/modules/customization-system/types/customization-availability-flow.type')
}));
jest.mock('src/modules/customization-system/helpers/order-items-customizations.service', () => ({
  fetchOrderItemCustomizationsState: jest.fn(),
  saveOrderItemCustomizationsState: jest.fn(),
  submitOrderItemCustomizationsState: jest.fn()
}));

const save = saveOrderItemCustomizationsState as jest.Mock;
const submit = submitOrderItemCustomizationsState as jest.Mock;
const eligible = { id: 'photos', isLocked: false, optionData: { displayWidget: 'image_upload' }, flowAvailability: ['customize-later-completion'] };
const refreshFailureMessage = "Your photos were submitted, but we couldn't refresh the order status. Please refresh the page to see the latest status.";
const awaitingArtwork = { code: 'awaiting_artwork', name: '', message: 'Awaiting artwork', blocking_progress: true, url: null, open_in_new_tab: false };
const orderItem = { item_id: 42, product: { sku: 'pet' }, extension_attributes: {} };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };

let refresh: jest.Mock;
const dispatch = jest.fn((action: string, payload?: unknown) => {
  if (action === 'product/loadProduct') return Promise.resolve({ id: 7, customizations: [eligible] });
  if (action === 'ordersHistory/FETCH_ORDERS_HISTORY') return refresh(payload);
  return Promise.resolve();
});

async function mountReadyActions () {
  const wrapper = mount(OrderItemActions, {
    propsData: { orderItem, actionsList: [awaitingArtwork], orderId: 1 },
    mocks: { $t: (key: string) => key },
    provide: {
      OrderItemPhotoUploadForm,
      [i18nInjectionKey as symbol]: { t: (key: string) => key },
      [routerInjectionKey as symbol]: { push: jest.fn() },
      [storeInjectionKey as symbol]: { dispatch, getters: { 'user/getUserToken': 'token' } }
    }
  });
  await flush();
  return wrapper;
}

async function submitPhotos (wrapper: Awaited<ReturnType<typeof mountReadyActions>>) {
  await wrapper.find('button').trigger('click');
  await wrapper.find('button._submit-button').trigger('click');
  await flush();
}

function notifications () {
  return dispatch.mock.calls.filter(([action]) => action === 'notification/spawnNotification').map(([, payload]) => payload);
}

beforeEach(() => {
  jest.clearAllMocks();
  refresh = jest.fn().mockResolvedValue(undefined);
  (fetchOrderItemCustomizationsState as jest.Mock).mockResolvedValue({
    id: 42,
    status_id: 1,
    customization_state: [{ customization_id: 'photos', value: [{ id: 'saved', url: '/saved.jpg' }] }]
  });
  save.mockResolvedValue({ errors: [] });
  submit.mockResolvedValue({ errors: [] });
});

describe('order item photo submission with the real form', () => {
  it('shows the submitted confirmation and sends no second request when the refresh fails', async () => {
    refresh.mockRejectedValue(new Error('refresh failed'));
    const wrapper = await mountReadyActions();
    expect(wrapper.text()).toContain("We're waiting for your photos.");
    await submitPhotos(wrapper);

    expect(wrapper.find('.-spinner').exists()).toBe(false);
    expect(wrapper.text()).toContain('Your photos have been submitted.');
    expect(wrapper.text()).not.toContain("We're waiting for your photos.");
    expect(wrapper.text()).not.toContain('Awaiting artwork');
    expect(wrapper.findAll('button')).toHaveLength(0);
    expect(notifications()).toEqual([{ type: 'warning', message: refreshFailureMessage, action1: { label: 'OK' } }]);
    expect(save).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('is final while a slow refresh is pending and after it succeeds with a stale action', async () => {
    let finishRefresh: () => void;
    refresh.mockImplementation(() => new Promise<void>(resolve => { finishRefresh = resolve; }));
    const wrapper = await mountReadyActions();
    await submitPhotos(wrapper);

    expect(wrapper.find('.-spinner').exists()).toBe(false);
    expect(wrapper.text()).toContain('Your photos have been submitted.');
    expect(wrapper.findAll('button')).toHaveLength(0);

    finishRefresh();
    await flush();
    await wrapper.setProps({ actionsList: [{ ...awaitingArtwork }] });
    expect(wrapper.text()).toContain('Your photos have been submitted.');
    expect(wrapper.text()).not.toContain('Awaiting artwork');
    expect(wrapper.findAll('button')).toHaveLength(0);
    expect(notifications()).toEqual([]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith({ filters: { excludeAlterationProducts: true } });
    expect(save).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('retains the selection and allows a retry after a submission failure', async () => {
    submit.mockResolvedValueOnce({ errors: [{ errorMessage: 'failed' }] });
    const wrapper = await mountReadyActions();
    await submitPhotos(wrapper);

    expect(wrapper.find('.-spinner').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Your photos have been submitted.');
    expect(refresh).not.toHaveBeenCalled();
    expect(notifications()).toEqual([expect.objectContaining({ type: 'danger', message: 'Something went wrong. Please try again.' })]);

    await wrapper.find('button._submit-button').trigger('click');
    await flush();
    expect(submit).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('Your photos have been submitted.');
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
