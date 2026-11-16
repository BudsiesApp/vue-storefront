import { MaestraModule } from '../../index';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { Logger } from '@vue-storefront/core/lib/logger';
const helpers = jest.requireMock('@vue-storefront/core/helpers');

jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
jest.mock('@vue-storefront/core/compatibility/plugins/event-bus', () => ({
  __esModule: true,
  default: { $on: jest.fn() }
}));
jest.mock('@vue-storefront/core/lib/logger', () => ({
  Logger: { error: jest.fn(() => jest.fn()) }
}));
jest.mock('src/modules/shared', () => ({ PAGE_RENDERED: 'page-rendered' }));

function register (previousRoute = { fullPath: '/previous' }) {
  MaestraModule({ store: { getters: { 'url/getPrevRoute': previousRoute } } } as any);

  expect(EventBus.$on).toHaveBeenCalledWith('page-rendered', expect.any(Function));

  return (EventBus.$on as jest.Mock).mock.calls[0][1] as () => void;
}

beforeEach(() => {
  jest.clearAllMocks();
  (helpers as any).isServer = false;
  delete (window as any).PopMechanic;
});

it('calls update once per page event with PopMechanic as receiver', () => {
  const sdk = {
    update: jest.fn(function (this: unknown) {
      expect(this).toBe(sdk);
    })
  };

  (window as any).PopMechanic = sdk;

  const notify = register();

  notify();

  expect(sdk.update).toHaveBeenCalledTimes(1);

  notify();

  expect(sdk.update).toHaveBeenCalledTimes(2);
});

it('skips initial load without a previous route', () => {
  const update = jest.fn();

  (window as any).PopMechanic = { update };
  register({} as any)();

  expect(update).not.toHaveBeenCalled();
});

it.each([undefined, {}, { update: 'unavailable' }])('skips unavailable SDK/method %p', sdk => {
  (window as any).PopMechanic = sdk;

  expect(register()).not.toThrow();
});

it('logs SDK errors with maestra and allows a later event', () => {
  const error = new Error('SDK error');
  const update = jest.fn().mockImplementationOnce(() => {
    throw error;
  });

  (window as any).PopMechanic = { update };

  const notify = register();

  expect(notify).not.toThrow();
  expect(Logger.error).toHaveBeenCalledWith(error, 'maestra');

  notify();

  expect(update).toHaveBeenCalledTimes(2);
});

it('registers no listener on the server', () => {
  (helpers as any).isServer = true;
  MaestraModule({} as any);

  expect(EventBus.$on).not.toHaveBeenCalled();
});
