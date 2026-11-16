import { mount } from '@vue/test-utils';

import OrderItem from '../../../components/order-item.vue';

jest.mock('src/modules/budsies', () => ({
  BaseImage: { name: 'BaseImage', props: ['src'], render: h => h('img', { class: 'base-image' }) }
}));
jest.mock('src/modules/customization-system', () => ({ getCustomizationSystemThumbnail: () => undefined }));
jest.mock('src/modules/file-storage', () => ({}));
jest.mock('../../../composables/use-order-item-progress-tracker', () => {
  const { computed } = jest.requireActual('vue');
  return {
    useOrderItemProgressTracker: () => ({
      activeStatus: computed(() => ({ id: 1 })),
      canShowExtendedProgressTracker: computed(() => false),
      canShowProgressTracker: computed(() => true),
      filteredStatusesList: computed(() => []),
      isOrderCancelled: computed(() => false),
      isOrderCompleted: computed(() => false),
      isOrderCancelledOrOnHoldOrCompleted: computed(() => false)
    })
  };
});
jest.mock('../../../components/order-item-actions.vue', () => ({
  name: 'OrderItemActions',
  props: ['actionsList', 'orderItem', 'orderId'],
  render: h => h('div', { class: 'actions-stub' })
}));
jest.mock('../../../components/order-item-extended-info.vue', () => ({
  name: 'OrderItemExtendedInfo',
  props: ['item'],
  render: h => h('div', { class: 'extended-info-stub' })
}));
jest.mock('../../../components/order-item-progress-tracker.vue', () => ({
  name: 'OrderItemProgressTracker',
  render: h => h('div', { class: 'progress-tracker-stub' })
}));
jest.mock('theme/components/molecules/m-expandable-section.vue', () => ({
  name: 'MExpandableSection',
  render (h) { return h('section', { class: 'expandable-stub' }, [this.$slots.title, this.$slots.default]); }
}));

const alterationForm = { name: 'AlterationForm', props: ['orderItem', 'alterationProduct'], render: h => h('div', { class: 'alteration-stub' }) };
const action = (code: string) => ({ code, name: code, message: code, blocking_progress: true, url: null, open_in_new_tab: false });

function createItem (actions = [action('awaiting_artwork'), action('re-order')]) {
  return {
    item_id: 42,
    display_id: '5227705',
    product: { sku: 'pet', name: 'Forevers Dog', thumbnail: '/thumb.jpg' },
    extension_attributes: { customizations: [] },
    available_actions: actions,
    progress_tracker: {}
  };
}

function mountItem (item = createItem(), alterationProduct = { sku: 'alteration' }) {
  return mount(OrderItem, {
    propsData: { item, orderId: 7, alterationProduct },
    mocks: { $t: (key: string) => key },
    provide: { AlterationProductForm: alterationForm, ImageHandlerService: undefined }
  });
}

describe('order item', () => {
  it('renders exactly one actions instance as the summary sibling after the name column', () => {
    const wrapper = mountItem();
    const actions = wrapper.findAllComponents({ name: 'OrderItemActions' });
    const info = wrapper.find('._info-container');

    expect(actions).toHaveLength(1);
    expect(actions.at(0).element.parentElement).toBe(info.element);
    expect(wrapper.find('._base-info-container').element.contains(actions.at(0).element)).toBe(false);
    expect(Array.from(info.element.children).map(child => child.className.split(' ')[0])).toEqual([
      '_image-container',
      '_base-info-container',
      '_actions'
    ]);
    expect(actions.at(0).props()).toMatchObject({ orderId: 7, orderItem: { item_id: 42 } });
    expect(actions.at(0).props('actionsList')).toHaveLength(2);
  });

  it('keeps the thumbnail, name and progress information in the summary', () => {
    const wrapper = mountItem();
    expect(wrapper.find('._image-container .base-image').exists()).toBe(true);
    expect(wrapper.find('._product-name').text()).toBe('5227705 - Forevers Dog');
    expect(wrapper.find('._base-info-container .progress-tracker-stub').exists()).toBe(true);
  });

  it('marks only items with an awaiting artwork action for the full-width photo layout', () => {
    expect(mountItem().find('._info-container').classes()).toContain('-photo-upload');
    expect(mountItem(createItem([action('re-order')])).find('._info-container').classes()).not.toContain('-photo-upload');
  });

  it('renders no actions without available actions', () => {
    const wrapper = mountItem(createItem([]));
    expect(wrapper.findComponent({ name: 'OrderItemActions' }).exists()).toBe(false);
    expect(wrapper.find('._info-container').classes()).not.toContain('-photo-upload');
  });

  it('keeps the item details and the injected alteration form outside the summary', () => {
    const wrapper = mountItem();
    expect(wrapper.find('._item-details .extended-info-stub').exists()).toBe(true);
    expect(wrapper.find('._info-container').element.contains(wrapper.find('._item-details').element)).toBe(false);
    const alteration = wrapper.findComponent(alterationForm);
    expect(alteration.exists()).toBe(true);
    expect(alteration.props()).toMatchObject({ alterationProduct: { sku: 'alteration' }, orderItem: { item_id: 42 } });
    expect(wrapper.find('._content').element.contains(alteration.element)).toBe(false);
  });

  it('keeps the same actions instance when the item data updates', async () => {
    const wrapper = mountItem();
    const before = wrapper.findComponent({ name: 'OrderItemActions' }).vm;
    await wrapper.setProps({ item: createItem([action('awaiting_artwork')]) });
    const actions = wrapper.findAllComponents({ name: 'OrderItemActions' });
    expect(actions).toHaveLength(1);
    expect(actions.at(0).vm).toBe(before);
  });
});
