import Storage from '../../storage';

let mockIsServer = false;
jest.mock('@vue-storefront/core/helpers', () => ({ get isServer () { return mockIsServer; } }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: () => () => {}, debug: () => () => {}, log: () => () => {} } }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: {} }));

function deferred<T> () {
  let resolveValue: (value: T) => void;
  let rejectValue: (error: Error) => void;
  const promise = new Promise<T>((resolve, reject) => { resolveValue = resolve; rejectValue = reject; });
  return { promise, resolve: value => resolveValue(value), reject: error => rejectValue(error) };
}

async function flush () { for (let i = 0; i < 10; i++) await Promise.resolve(); }

let driverId = 0;
function makeDriver (ready, getItem = jest.fn()) {
  const collection = { _config: { name: `test-db-${++driverId}`, storeName: 'storage-test' }, ready, getItem };
  const storage = new Storage(collection);
  jest.spyOn(storage, 'recreateDb').mockImplementation(() => {});
  return { storage, collection };
}

describe('storage getItem independent callback timeouts', () => {
  beforeEach(() => { jest.useFakeTimers(); mockIsServer = false; });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

  it('keeps staggered hanging reads independent and their promises pending', async () => {
    const { storage } = makeDriver(() => new Promise(() => {}));
    const first = jest.fn(); const second = jest.fn();
    let firstSettled = false; let secondSettled = false;
    storage.getItem('first', first).then(() => { firstSettled = true; });
    jest.advanceTimersByTime(200);
    storage.getItem('second', second).then(() => { secondSettled = true; });
    jest.advanceTimersByTime(599);
    expect(first).not.toHaveBeenCalled(); expect(second).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(first).toHaveBeenCalledWith(null, null); expect(second).not.toHaveBeenCalled();
    jest.advanceTimersByTime(199);
    expect(second).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await flush();
    expect(first).toHaveBeenCalledTimes(1); expect(second).toHaveBeenCalledWith(null, null);
    expect(firstSettled).toBe(false); expect(secondSettled).toBe(false);
  });

  it('does not let a promise-only read cancel a callback while backend reads hang', async () => {
    const { storage } = makeDriver(() => Promise.resolve(), () => new Promise(() => {}));
    const callback = jest.fn();
    const callbackPromise = storage.getItem('callback', callback);
    jest.advanceTimersByTime(200);
    const promiseOnly = storage.getItem('promise-only');
    let settled = false;
    Promise.all([callbackPromise, promiseOnly]).then(() => { settled = true; });
    await flush();
    jest.advanceTimersByTime(600);
    expect(callback).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(200);
    await flush();
    expect(settled).toBe(false);
  });

  it('clears only the early success timer while another read hangs', async () => {
    const read = deferred<string>();
    const { storage } = makeDriver(() => Promise.resolve(), key => key === 'early' ? read.promise : new Promise(() => {}));
    const early = jest.fn(); const hanging = jest.fn();
    const earlyPromise = storage.getItem('early', early);
    storage.getItem('hanging', hanging);
    await flush();
    read.resolve('value');
    await expect(earlyPromise).resolves.toBe('value');
    await flush();
    expect(early).toHaveBeenCalledWith(null, 'value');
    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(800);
    expect(hanging).toHaveBeenCalledWith(null, null);
    expect(early).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each(['success', 'error'])('keeps the promise contract and suppresses late %s callbacks', async mode => {
    const read = deferred<string>();
    const { storage } = makeDriver(() => Promise.resolve(), () => read.promise);
    const callback = jest.fn();
    const result = storage.getItem('late', callback);
    let settled = false;
    result.then(() => { settled = true; });
    await flush();
    jest.advanceTimersByTime(800);
    await flush();
    expect(callback).toHaveBeenCalledWith(null, null);
    expect(settled).toBe(false);
    if (mode === 'success') read.resolve('late-value');
    else read.reject(new Error('read failure'));
    await expect(result).resolves.toBe(mode === 'success' ? 'late-value' : undefined);
    expect(callback).toHaveBeenCalledTimes(1);
    if (mode === 'success') expect(storage.getLocalCache('late')).toBe('late-value');
  });

  it('preserves backend readiness rejection and its existing callback fallback', async () => {
    const { storage } = makeDriver(() => Promise.reject(new Error('ready failure')));
    const callback = jest.fn();
    await expect(storage.getItem('key', callback)).rejects.toThrow('ready failure');
    await flush();
    expect(jest.getTimerCount()).toBe(1);
    expect(callback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(800);
    expect(callback).toHaveBeenCalledWith(null, null);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('preserves late readiness rejection without delivering a second callback', async () => {
    const ready = deferred<void>();
    const { storage } = makeDriver(() => ready.promise);
    const callback = jest.fn();
    const result = storage.getItem('key', callback);
    const rejected = expect(result).rejects.toThrow('late ready failure');
    jest.advanceTimersByTime(800);
    expect(callback).toHaveBeenCalledTimes(1);
    ready.reject(new Error('late ready failure'));
    await rejected;
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('retains empty and failed-read fallbacks, local cache and server fast path', async () => {
    const { storage } = makeDriver(() => Promise.resolve(), key => key === 'failed' ? Promise.reject(new Error('failed')) : Promise.resolve(key === 'empty' ? null : 'cached'));
    const empty = jest.fn(); const failed = jest.fn(); const cached = jest.fn();
    await expect(storage.getItem('empty', empty)).resolves.toBeNull();
    await expect(storage.getItem('failed', failed)).resolves.toBeUndefined();
    await expect(storage.getItem('cached', cached)).resolves.toBe('cached');
    const fast = jest.fn();
    await expect(storage.getItem('cached', fast)).resolves.toBe('cached');
    expect(empty).toHaveBeenCalledWith(null, null); expect(failed).toHaveBeenCalledWith(null, null);
    expect(cached).toHaveBeenCalledWith(null, 'cached'); expect(fast).toHaveBeenCalledWith(null, 'cached');
    mockIsServer = true;
    const server = makeDriver(() => { throw new Error('must not read'); }).storage;
    const serverCallback = jest.fn();
    await expect(server.getItem('missing', serverCallback)).resolves.toBeNull();
    expect(serverCallback).toHaveBeenCalledWith(null, null);
  });

  it('retains the local-cache fallback value on timeout', async () => {
    const collection = { _config: { name: 'fallback-db', storeName: 'fallback-store' }, ready: () => new Promise(() => {}) };
    const storage = new Storage(collection, false);
    jest.spyOn(storage, 'recreateDb').mockImplementation(() => {});
    await storage.setItem('key', { text: 'cached' }, undefined, true);
    const callback = jest.fn();
    storage.getItem('key', callback);
    jest.advanceTimersByTime(800);
    expect(callback).toHaveBeenCalledWith(null, { text: 'cached' });
  });

  it.each(['remove', 'set'])('does not refill stale cache after timed-out read and same-key %s from another driver', async mutation => {
    const read = deferred<any>();
    const oldValue = { draft: 'old' };
    const newValue = { draft: 'new' };
    let backing = oldValue;
    const getItem = jest.fn().mockImplementationOnce(() => read.promise).mockImplementation(() => Promise.resolve(backing));
    const { storage, collection } = makeDriver(() => Promise.resolve(), getItem);
    (collection as any).removeItem = jest.fn().mockImplementation(() => { backing = null; return Promise.resolve(); });
    (collection as any).setItem = jest.fn().mockImplementation((_key, value) => { backing = value; return Promise.resolve(value); });
    const otherDriver = new Storage(collection);
    const callback = jest.fn();
    const pending = storage.getItem('draft', callback);
    await flush();
    jest.advanceTimersByTime(800);
    expect(callback).toHaveBeenCalledWith(null, null);
    if (mutation === 'remove') await otherDriver.removeItem('draft');
    else await otherDriver.setItem('draft', newValue);
    read.resolve(oldValue);
    await expect(pending).resolves.toEqual(oldValue);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(storage.getLocalCache('draft')).toEqual(mutation === 'remove' ? null : newValue);
    await expect(otherDriver.getItem('draft')).resolves.toEqual(mutation === 'remove' ? null : newValue);
    expect(getItem).toHaveBeenCalledTimes(mutation === 'remove' ? 2 : 1);
  });

  it('does not overwrite a falsy memory-only write with an older read', async () => {
    const read = deferred<any>();
    const getItem = jest.fn().mockImplementationOnce(() => read.promise).mockResolvedValue(null);
    const { storage, collection } = makeDriver(() => Promise.resolve(), getItem);
    const otherDriver = new Storage(collection);
    const pending = storage.getItem('draft');
    await flush();
    jest.advanceTimersByTime(800);
    await storage.setItem('draft', false, undefined, true);
    read.resolve('old');
    await expect(pending).resolves.toBe('old');
    expect(storage.getLocalCache('draft')).toBe(false);
    await expect(otherDriver.getItem('draft')).resolves.toBeNull();
    expect(getItem).toHaveBeenCalledTimes(2);
    expect(storage.getLocalCache('draft')).toBe(false);
  });

  it('captures the revision before backend readiness, not after it', async () => {
    const ready = deferred<void>();
    const { storage, collection } = makeDriver(() => ready.promise, jest.fn().mockResolvedValue('old'));
    (collection as any).removeItem = jest.fn().mockResolvedValue(undefined);
    const pending = storage.getItem('draft');
    jest.advanceTimersByTime(800);
    await storage.removeItem('draft');
    ready.resolve();
    await expect(pending).resolves.toBe('old');
    expect(storage.getLocalCache('draft')).toBeNull();
  });

  it('allows a late read to fill its own cache after a different key is mutated', async () => {
    const read = deferred<string>();
    const { storage } = makeDriver(() => Promise.resolve(), () => read.promise);
    const pending = storage.getItem('draft');
    await flush();
    jest.advanceTimersByTime(800);
    await storage.setItem('other', 'new', undefined, true);
    read.resolve('draft-value');
    await expect(pending).resolves.toBe('draft-value');
    expect(storage.getLocalCache('draft')).toBe('draft-value');
    expect(storage.getLocalCache('other')).toBe('new');
  });
});
