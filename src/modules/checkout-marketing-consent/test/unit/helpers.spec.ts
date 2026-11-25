import {
  applyConsentToOrder,
  consentAvailability,
  consentPayload,
  acceptedOrderChannels,
  remainingConsentChannels,
  emailKey
} from '../../helpers';
import { ConsentSelection, MarketingConsentSettings } from '../../types/marketing-consent';

describe('checkout marketing consent policy', () => {
  const settings: MarketingConsentSettings = {
    emailConsentLabel: 'Email',
    smsConsentLabel: 'SMS',
    smsEnabled: true
  };
  const selection: ConsentSelection = {
    email: 'Test@example.com',
    emailConsent: true,
    smsConsent: true,
    phone: '+14165550123'
  };

  it('offers only enabled channels with labels', () => {
    const disabledSms: MarketingConsentSettings = {
      emailConsentLabel: ' ',
      smsConsentLabel: 'SMS',
      smsEnabled: false
    };

    expect(consentAvailability()).toEqual({ email: false, sms: false });
    expect(consentAvailability(disabledSms)).toEqual({ email: false, sms: false });
    expect(consentAvailability(settings)).toEqual({ email: true, sms: true });
    expect(emailKey(' Test@Example.com ')).toBe('test@example.com');
  });

  it('derives unaccepted offered channels from the placed order', () => {
    expect(acceptedOrderChannels()).toEqual({ email: false, sms: false });
    expect(acceptedOrderChannels({ addressInformation: {} })).toEqual({ email: false, sms: false });
    const accepted = acceptedOrderChannels({ addressInformation: { paymentExtraFields: { budsies_marketing_consent: { email: true, sms: 1 } } } });
    expect(accepted).toEqual({ email: true, sms: false });
    expect(remainingConsentChannels(settings, accepted)).toEqual({ email: false, sms: true });
    expect(remainingConsentChannels({ ...settings, smsEnabled: false }, accepted)).toEqual({ email: false, sms: false });
  });

  it('limits consent to the offered channels and matching email', () => {
    const withoutSms = { ...settings, smsEnabled: false };
    const smsUnchecked = { ...selection, smsConsent: false };

    expect(consentPayload(settings, selection, ' TEST@example.com ')).toEqual({
      email: true,
      sms: true,
      phone: selection.phone
    });
    expect(consentPayload(settings, selection, 'other@example.com')).toEqual({
      email: false,
      sms: false
    });
    expect(consentPayload(withoutSms, selection, selection.email)).toEqual({ email: true });
    expect(consentPayload(settings, smsUnchecked, selection.email)).toEqual({
      email: true,
      sms: false
    });
    expect(consentPayload(undefined, selection, selection.email)).toBeUndefined();
  });

  it('preserves other payment extras', () => {
    const order = {
      personalDetails: { emailAddress: selection.email },
      addressInformation: { paymentExtraFields: { existing: 123 } }
    };

    const result = applyConsentToOrder(order, settings, selection);

    expect(result.addressInformation.paymentExtraFields).toEqual({
      existing: 123,
      budsies_marketing_consent: {
        email: true,
        sms: true,
        phone: selection.phone
      }
    });
  });
});
