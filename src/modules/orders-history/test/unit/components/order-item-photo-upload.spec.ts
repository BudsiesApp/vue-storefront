import { shallowMount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import OrderItem from '../../../components/order-item.vue';

jest.mock('src/modules/shared', () => ({ BudsieStatus: {} }));
jest.mock('src/modules/file-storage', () => ({}));
jest.mock('../../../components/order-item-actions.vue', () => ({ name: 'OrderItemActions', props: ['actionsList'], render: h => h('div') }));
jest.mock('../../../components/order-item-extended-info.vue', () => ({ render: h => h('div') }));
jest.mock('../../../components/order-item-progress-tracker.vue', () => ({ render: h => h('div') }));
jest.mock('src/modules/customization-system', () => ({ getCustomizationSystemThumbnail: jest.fn() }));
jest.mock('src/modules/budsies', () => ({ BaseImage: { render: h => h('img') } }));

const form = defineComponent({ name: 'PhotoForm', props: { orderItem: { type: Object, required: true } }, render: h => h('div') });
const action = (code: string) => ({ code, message: code, blocking_progress: true });
const item = {
  item_id: 42, display_id: 42, product: { name: 'Pet', thumbnail: '/pet.jpg' },
  progress_tracker: { status_list: [], status_id: 1 },
  available_actions: [action('awaiting_artwork'), action('re-order')]
};

function mountItem () {
  return shallowMount(OrderItem, {
    propsData: { item, orderId: 1 },
    provide: { OrderItemPhotoUploadForm: form, AlterationProductForm: undefined, ImageHandlerService: undefined },
    mocks: { $t: (key: string) => key }
  });
}

describe('inline photo form integration', () => {
  it('retains the email fallback while loading or ineligible', async () => {
    const wrapper = mountItem();
    expect(wrapper.findComponent({ name: 'OrderItemActions' }).props('actionsList')).toEqual(item.available_actions);
    wrapper.findComponent(form).vm.$emit('ready-changed', false);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'OrderItemActions' }).props('actionsList')).toEqual(item.available_actions);
  });

  it('replaces only awaiting artwork once ready without mutating actions', async () => {
    const wrapper = mountItem();
    wrapper.findComponent(form).vm.$emit('ready-changed', true);
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'OrderItemActions' }).props('actionsList')).toEqual([item.available_actions[1]]);
    expect(item.available_actions).toHaveLength(2);
    expect(wrapper.findComponent(form).props('orderItem')).toEqual(item);
  });

  it('does not mount the form without awaiting artwork', async () => {
    const wrapper = mountItem();
    await wrapper.setProps({ item: { ...item, available_actions: [action('re-order')] } });
    expect(wrapper.findComponent(form).exists()).toBe(false);
  });
});
