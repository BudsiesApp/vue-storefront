import { mount } from '@vue/test-utils';
import Vue from 'vue';
import VueI18n from 'vue-i18n';
import config from 'config';
import { i18nInjectionKey, storeInjectionKey } from '@vue-storefront/core/application-services';

import ShipmentInfo from '../../../components/order-item-shipment-info.vue';
import ExtendedInfo from '../../../components/order-item-extended-info.vue';

jest.mock('config', () => ({}));
jest.mock('src/modules/shared', () => ({ BudsieStatus: { ON_HOLD: 14 } }));
jest.mock('src/modules/customization-system', () => ({ CartItemConfiguration: { render: h => h('div') } }));
jest.mock('@storefront-ui/vue', () => ({ SfHeading: { props: ['title'], render (h) { return h('h5', this.title); } } }));
jest.mock('../../../components/order-item-progress-tracker.vue', () => ({ render: h => h('div') }));

Vue.use(VueI18n);
const i18n = new VueI18n({ locale: 'en', messages: { en: { 'In time for {holidayName}': 'Ready for {holidayName}' } } });
const translate = (key: string, values?: object) => key === 'In time for {holidayName}' ? i18n.t(key, values as any) : key;
const provide = {
  [i18nInjectionKey as symbol]: { t: translate },
  [storeInjectionKey as symbol]: { getters: {} }
};
const options = { provide, mocks: { $t: translate } };
const estimate = '2026-12-20T12:00:00Z';
const formattedEstimate = new Date(estimate).toLocaleDateString();

function setOption (value?: boolean) {
  if (value === undefined) delete (config as any).orderHistory;
  else (config as any).orderHistory = { displayHolidayPromise: value };
}

function item (name?: string, overrides = {}) {
  return {
    shipments: [], estimated_shipment_date: estimate, quantity: 1,
    extension_attributes: name === undefined ? undefined : { shipping_holiday_name: name },
    progress_tracker: { status_id: 1, status_list: [{ id: 1 }], cancelled: false, completed: false },
    available_actions: [], ...overrides
  };
}

afterEach(() => { setOption(); jest.useRealTimers(); });

describe('holiday shipment presentation', () => {
  it.each(['Christmas', "Valentine's Day 2027"])('substitutes the unchanged name %s in the translated message', name => {
    setOption(true);
    const wrapper = mount(ShipmentInfo, { ...options, propsData: { shipments: [], estimatedShipmentDate: estimate, shippingHolidayName: name } });
    expect(wrapper.text()).toBe(`Ready for ${name}`);
    expect(wrapper.text()).not.toContain('Est. shipment date');
    expect(wrapper.text()).not.toContain(formattedEstimate);
  });

  it.each([
    [false, 'Christmas'], [undefined, 'Christmas'], [true, undefined], [true, '']
  ])('retains the localized estimate with option %s and name %s', (enabled, name) => {
    setOption(enabled);
    const wrapper = mount(ShipmentInfo, { ...options, propsData: { shipments: [], estimatedShipmentDate: estimate, shippingHolidayName: name } });
    expect(wrapper.text()).toBe(`Est. shipment date: ${formattedEstimate}`);
  });

  it('keeps the promise after the holiday for an unshipped item', () => {
    setOption(true);
    jest.useFakeTimers().setSystemTime(new Date('2027-01-10T12:00:00Z'));
    const wrapper = mount(ShipmentInfo, { ...options, propsData: { shipments: [], estimatedShipmentDate: estimate, shippingHolidayName: 'Christmas' } });
    expect(wrapper.text()).toBe('Ready for Christmas');
  });

  it('retains the actual shipment date and tracking instead of the promise', () => {
    setOption(true);
    const shipments = [{ shipment_date: '2026-12-10T12:00:00Z', carrier_code: 'UPS', tracking_number: '123' }];
    const wrapper = mount(ShipmentInfo, { ...options, propsData: { shipments, estimatedShipmentDate: estimate, shippingHolidayName: 'Christmas' } });
    expect(wrapper.text()).toContain(`Shipment date: ${new Date(shipments[0].shipment_date).toLocaleDateString()}`);
    expect(wrapper.text()).toContain('UPS - 123');
    expect(wrapper.text()).not.toContain('Ready for');
    expect(wrapper.text()).not.toContain('Est. shipment date');
  });

  it('retains tracking without a shipment date alongside the promise', () => {
    setOption(true);
    const wrapper = mount(ShipmentInfo, { ...options, propsData: { shipments: [{ carrier_code: 'UPS', tracking_number: '123' }], estimatedShipmentDate: estimate, shippingHolidayName: 'Christmas' } });
    expect(wrapper.text()).toContain('Ready for Christmas');
    expect(wrapper.text()).toContain('UPS - 123');
  });

  it('passes each mixed-order item name to the real shipment renderer', () => {
    setOption(true);
    const wrappers = [item('Christmas'), item("Valentine's Day"), item()].map(value => mount(ExtendedInfo, { ...options, propsData: { item: value } }));
    expect(wrappers.map(wrapper => wrapper.findComponent(ShipmentInfo).text())).toEqual(['Ready for Christmas', "Ready for Valentine's Day", `Est. shipment date: ${formattedEstimate}`]);
  });

  it('does not show shipment information without an estimate or shipments', () => {
    setOption(true);
    const wrapper = mount(ExtendedInfo, { ...options, propsData: { item: item('Christmas', { estimated_shipment_date: null }) } });
    expect(wrapper.findComponent(ShipmentInfo).exists()).toBe(false);
  });

  it('does not show shipment information when an action blocks progress', () => {
    setOption(true);
    const wrapper = mount(ExtendedInfo, { ...options, propsData: { item: item('Christmas', { available_actions: [{ blocking_progress: true }] }) } });
    expect(wrapper.findComponent(ShipmentInfo).exists()).toBe(false);
  });
});
