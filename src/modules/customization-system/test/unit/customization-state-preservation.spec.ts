import { defineComponent, h, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useCustomizationStatePreservation } from '../../composables/use-customization-state-preservation';
import Storage from '@vue-storefront/core/lib/store/storage';

const mockStorage = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };
const mockGetStorage = jest.fn(() => mockStorage);
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { get: () => mockGetStorage() } }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: () => () => {}, debug: () => () => {} } }));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));

async function flush () {
  for (let i = 0; i < 12; i++) await Promise.resolve();
  await nextTick();
}

describe('customization restoration readiness', () => {
  let state, sku, owner, merge;
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStorage.mockReset().mockReturnValue(mockStorage);
    mockStorage.setItem.mockResolvedValue(undefined);
    mockStorage.removeItem.mockResolvedValue(undefined);
    state = ref([{ customization_id: 'production', value: 'rush' }]);
    sku = ref('product');
    merge = jest.fn(value => { state.value = value; });
  });

  function mountForm () {
    return mount(defineComponent({
      setup () {
        owner = useCustomizationStatePreservation(sku, state, ref(undefined), [], ref(true), merge, () => ({}));
        return () => h('div', owner.restorationSettled.value ? 'ready' : 'pending');
      }
    }));
  }

  it('waits for the one read and preserves a restored Rush', async () => {
    let complete;
    mockStorage.getItem.mockImplementation((_key, callback) => { complete = callback; return new Promise(() => {}); });
    const wrapper = mountForm();
    await flush();
    expect(wrapper.text()).toBe('pending');
    expect(mockStorage.setItem).not.toHaveBeenCalled();
    expect(mockStorage.getItem).toHaveBeenCalledTimes(1);
    complete(null, { customizationState: [{ customization_id: 'production', value: 'rush' }] });
    await flush();
    expect(wrapper.text()).toBe('ready');
    expect(merge).toHaveBeenCalledTimes(1);
    expect(state.value[0].value).toBe('rush');
    wrapper.destroy();
  });

  it.each(['absence', 'reject', 'throw'])('treats %s as absence and allows normal saving', async mode => {
    mockStorage.getItem.mockImplementation((_key, callback) => {
      if (mode === 'throw') throw new Error('unavailable');
      if (mode === 'reject') return Promise.reject(new Error('unavailable'));
      callback(null, null);
      return Promise.resolve(null);
    });
    const wrapper = mountForm();
    await flush();
    expect(wrapper.text()).toBe('ready');
    expect(state.value[0].value).toBe('rush');
    expect(merge).not.toHaveBeenCalled();
    state.value = [{ customization_id: 'production', value: 'standard' }];
    await flush();
    expect(mockStorage.setItem).toHaveBeenCalledWith('form-state/product', expect.objectContaining({ customizationState: state.value }));
    wrapper.destroy();
  });

  it('treats storage acquisition failure as absence and permits a later ordinary save', async () => {
    mockGetStorage.mockImplementationOnce(() => { throw new Error('unavailable'); });
    const wrapper = mountForm();
    await flush();
    expect(wrapper.text()).toBe('ready');
    expect(state.value[0].value).toBe('rush');
    state.value = [{ customization_id: 'production', value: 'standard' }];
    await flush();
    expect(mockStorage.setItem).toHaveBeenCalled();
    wrapper.destroy();
  });

  it('ignores a stale completion when the product changes', async () => {
    const callbacks = [];
    mockStorage.getItem.mockImplementation((_key, callback) => { callbacks.push(callback); return new Promise(() => {}); });
    const wrapper = mountForm();
    await flush();
    sku.value = 'other';
    callbacks[0](null, { customizationState: [{ customization_id: 'production', value: 'old' }] });
    await flush();
    expect(wrapper.text()).toBe('pending');
    expect(merge).not.toHaveBeenCalled();
    expect(mockStorage.getItem).toHaveBeenCalledTimes(2);
    callbacks[1](null, null);
    await flush();
    expect(wrapper.text()).toBe('ready');
    expect(state.value[0].value).toBe('rush');
    wrapper.destroy();
  });

  it('settles with the existing driver timeout while its promise is pending', async () => {
    jest.useFakeTimers();
    try {
      const collection = { _config: { name: 'draft-timeout', storeName: 'draft-timeout' }, ready: () => new Promise(() => {}) };
      const storage = new Storage(collection);
      jest.spyOn(storage, 'recreateDb').mockImplementation(() => {});
      mockStorage.getItem.mockImplementation(storage.getItem.bind(storage));
      const wrapper = mountForm();
      await flush();
      expect(wrapper.text()).toBe('pending');
      jest.advanceTimersByTime(800);
      await flush();
      expect(wrapper.text()).toBe('ready');
      expect(state.value[0].value).toBe('rush');
      state.value = [{ customization_id: 'production', value: 'standard' }];
      await flush();
      expect(mockStorage.setItem).toHaveBeenCalled();
      wrapper.destroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('settles concurrent order-item restorations independently while driver promises remain pending', async () => {
    jest.useFakeTimers();
    try {
      const collection = { _config: { name: 'bulk-timeout', storeName: 'bulk-timeout' }, ready: () => new Promise(() => {}) };
      const storage = new Storage(collection);
      jest.spyOn(storage, 'recreateDb').mockImplementation(() => {});
      const reads = jest.spyOn(storage, 'getItem');
      mockGetStorage.mockReturnValue(storage as any);
      const Bulk = defineComponent({
        setup () {
          const first = useCustomizationStatePreservation(ref('orderItemCustomization:1'), ref([]), ref(undefined), [], ref(true), jest.fn(), () => ({}));
          const second = useCustomizationStatePreservation(ref('orderItemCustomization:2'), ref([]), ref(undefined), [], ref(true), jest.fn(), () => ({}));
          return () => h('div', `${first.restorationSettled.value}/${second.restorationSettled.value}`);
        }
      });
      const wrapper = mount(Bulk);
      await flush();
      expect(reads).toHaveBeenCalledTimes(2);
      expect(reads.mock.calls.map(([key]) => key)).toEqual(['form-state/orderItemCustomization:1', 'form-state/orderItemCustomization:2']);
      jest.advanceTimersByTime(800);
      await flush();
      expect(wrapper.text()).toBe('true/true');
      jest.advanceTimersByTime(5000);
      await flush();
      expect(wrapper.text()).toBe('true/true');
      wrapper.destroy();
    } finally {
      jest.useRealTimers();
    }
  });

  it.each(['cart', 'disallowed', 'rejected'].flatMap(mode => ['resolve', 'reject'].map(result => [mode, result])))('keeps %s cleanup ordered until it settles with %s', async (mode, result) => {
    let finishRemoval;
    let failRemoval;
    mockStorage.removeItem.mockImplementation(() => new Promise((resolve, reject) => { finishRemoval = resolve; failRemoval = reject; }));
    mockStorage.getItem.mockImplementation((_key, callback) => {
      const data = { customizationState: [{ customization_id: 'production', value: 'old' }] };
      callback(null, data);
      return Promise.resolve(data);
    });
    const wrapper = mount(defineComponent({
      setup () {
        owner = useCustomizationStatePreservation(sku, state, ref(mode === 'cart' ? {} as any : undefined), [], ref(mode !== 'disallowed'), merge, () => ({}), mode === 'rejected' ? async () => false : undefined);
        return () => h('div', owner.restorationSettled.value ? 'ready' : 'pending');
      }
    }));
    try {
      await flush();
      expect(wrapper.text()).toBe('pending');
      expect(state.value[0].value).toBe('rush');
      expect(mockStorage.removeItem).toHaveBeenCalledWith('form-state/product');
      state.value = [{ customization_id: 'production', value: 'during-removal' }];
      await flush();
      expect(wrapper.text()).toBe('pending');
      expect(mockStorage.setItem).not.toHaveBeenCalled();
      if (result === 'resolve') finishRemoval();
      else failRemoval(new Error('cleanup failed'));
      await flush();
      expect(wrapper.text()).toBe('ready');
      if (mode !== 'cart') {
        state.value = [{ customization_id: 'production', value: 'standard' }];
        await flush();
        expect(mockStorage.setItem).toHaveBeenCalledWith('form-state/product', expect.objectContaining({ customizationState: state.value }));
      }
    } finally {
      wrapper.destroy();
    }
  });

  it.each(['resolve', 'reject'])('does not let a stale %s removal release the new product gate', async result => {
    const removals = [];
    mockStorage.removeItem.mockImplementation(key => new Promise((resolve, reject) => { removals.push({ key, resolve, reject }); }));
    const wrapper = mount(defineComponent({
      setup () {
        owner = useCustomizationStatePreservation(sku, state, ref(undefined), [], ref(false), merge, () => ({}));
        return () => h('div', owner.restorationSettled.value ? 'ready' : 'pending');
      }
    }));
    try {
      await flush();
      expect(removals[0].key).toBe('form-state/product');
      sku.value = 'other';
      await flush();
      expect(wrapper.text()).toBe('pending');
      if (result === 'resolve') removals[0].resolve();
      else removals[0].reject(new Error('old cleanup failed'));
      await flush();
      expect(removals[1].key).toBe('form-state/other');
      expect(wrapper.text()).toBe('pending');
      expect(mockStorage.setItem).not.toHaveBeenCalled();
      removals[1].resolve();
      await flush();
      expect(wrapper.text()).toBe('ready');
    } finally {
      wrapper.destroy();
    }
  });

  it.each(['cart', 'disallowed', 'rejected'])('accepts continued loading and no save when %s cleanup never settles', async mode => {
    mockStorage.removeItem.mockReturnValue(new Promise(() => {}));
    mockStorage.getItem.mockImplementation((_key, callback) => {
      const data = { customizationState: [{ customization_id: 'production', value: 'old' }] };
      callback(null, data);
      return Promise.resolve(data);
    });
    const wrapper = mount(defineComponent({
      setup () {
        owner = useCustomizationStatePreservation(sku, state, ref(mode === 'cart' ? {} as any : undefined), [], ref(mode !== 'disallowed'), merge, () => ({}), mode === 'rejected' ? async () => false : undefined);
        return () => h('div', owner.restorationSettled.value ? 'ready' : 'pending');
      }
    }));
    try {
      await flush();
      state.value = [{ customization_id: 'production', value: 'standard' }];
      await flush();
      await flush();
      expect(mockStorage.removeItem).toHaveBeenCalledTimes(1);
      expect(wrapper.text()).toBe('pending');
      expect(mockStorage.setItem).not.toHaveBeenCalled();
    } finally {
      wrapper.destroy();
    }
  });
});
