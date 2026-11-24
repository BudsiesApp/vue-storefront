import Vue from 'vue';
import Vuex, { Store } from 'vuex';

import { useStore } from '@vue-storefront/core/application-services';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

import { useCheckoutConsent } from '../../composables/use-checkout-consent';
import { consentPayload } from '../../helpers';
import { consentModule } from '../../store';
import { ConsentSelection, MarketingConsentSettings } from '../../types/marketing-consent';
import { SAVE_SELECTION } from '../../types/store/actions';
import { GET_SELECTION } from '../../types/store/getters';
import { SET_HYDRATED, SET_SELECTION } from '../../types/store/mutations';

jest.mock('@vue-storefront/core/application-services', () => ({ useStore: jest.fn() }));
jest.mock('@vue-storefront/core/helpers', () => ({ isServer: false }));
jest.mock('@vue-storefront/core/lib/logger', () => ({ Logger: { error: jest.fn(() => jest.fn()) } }));
jest.mock('@vue-storefront/core/lib/storage-manager', () => ({ StorageManager: { get: jest.fn() } }));

Vue.use(Vuex);

const FULL_SETTINGS: MarketingConsentSettings = {
  emailConsentLabel: 'Email',
  smsConsentLabel: 'SMS',
  smsEnabled: true
};
const PHONE = '+14165550123';
const EMPTY_VALUE = {
  emailConsent: false,
  smsConsent: false,
  phone: ''
};

function createStore (
  settings: MarketingConsentSettings = {},
  selection: ConsentSelection | null = null
): Store<any> {
  const store = new Vuex.Store({
    modules: { checkoutMarketingConsent: consentModule },
    getters: {
      'backend-settings/getSettingByCompositeKey': () => () => settings
    }
  });

  store.commit(`checkoutMarketingConsent/${SET_SELECTION}`, selection);
  store.commit(`checkoutMarketingConsent/${SET_HYDRATED}`);
  (useStore as jest.Mock).mockReturnValue(store);

  return store;
}

describe('checkout consent draft', () => {
  it('binds the first email on save and resets only on later email changes', async () => {
    const store = createStore(FULL_SETTINGS);
    const dispatch = jest.spyOn(store, 'dispatch').mockResolvedValue(undefined);
    const consent = useCheckoutConsent();

    consent.draft.value = {
      emailConsent: true,
      smsConsent: true,
      phone: PHONE
    };
    consent.updateEmail('a');
    consent.updateEmail('a@example.com');

    expect(consent.draft.value.emailConsent).toBe(true);

    await consent.save('a@example.com');
    consent.updateEmail('A@EXAMPLE.COM');

    expect(consent.draft.value.smsConsent).toBe(true);

    consent.updateEmail('b@example.com');

    expect(consent.draft.value).toEqual(EMPTY_VALUE);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(`checkoutMarketingConsent/${SAVE_SELECTION}`, {
      email: 'a@example.com',
      emailConsent: true,
      smsConsent: true,
      phone: PHONE
    });
  });

  it('restores only a matching email and reads flags strictly', () => {
    createStore({}, {
      email: 'a@example.com',
      emailConsent: 'true',
      smsConsent: false,
      phone: PHONE
    } as unknown as ConsentSelection);

    const consent = useCheckoutConsent();

    consent.updateEmail('b@example.com');

    expect(consent.draft.value.phone).toBe('');

    consent.updateEmail('A@example.com');

    expect(consent.draft.value).toEqual({
      emailConsent: false,
      smsConsent: false,
      phone: PHONE
    });
  });

  it('binds choices made after a prefilled email to that email', () => {
    createStore();

    const consent = useCheckoutConsent();

    consent.updateEmail('first@example.test');
    consent.draft.value = {
      emailConsent: true,
      smsConsent: true,
      phone: PHONE
    };
    consent.updateEmail('second@example.test');

    expect(consent.draft.value).toEqual(EMPTY_VALUE);
  });

  it.each(['emailConsent', 'smsConsent'] as const)(
    'invalidates a saved selection when %s is unchecked before navigating forward',
    (field) => {
      const store = createStore(FULL_SETTINGS, {
        email: 'a@example.test',
        emailConsent: true,
        smsConsent: true,
        phone: PHONE
      });
      const consent = useCheckoutConsent();

      consent.updateEmail('a@example.test');
      consent.draft.value = {
        ...consent.draft.value,
        [field]: false
      };

      const selection = store.getters[`checkoutMarketingConsent/${GET_SELECTION}`];
      const payload = consentPayload(FULL_SETTINGS, selection, 'a@example.test');

      expect(payload).toEqual({
        email: false,
        sms: false
      });
    }
  );

  it.each([
    ['rejects', () => Promise.reject(new Error('storage failed'))],
    ['never settles', () => new Promise<void>(() => undefined)]
  ])('resolves save and keeps the selection in state when the storage write %s', async (_, write) => {
    const store = createStore(FULL_SETTINGS);
    const setItem = jest.fn(write);

    (StorageManager.get as jest.Mock).mockReturnValue({ setItem });

    const consent = useCheckoutConsent();

    consent.updateEmail('a@example.test');

    await consent.save('a@example.test');

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(store.getters[`checkoutMarketingConsent/${GET_SELECTION}`]).toEqual({
      email: 'a@example.test',
      emailConsent: false,
      smsConsent: false,
      phone: ''
    });
  });
});
