import {
  ConsentAvailability,
  ConsentOrder,
  ConsentPayload,
  ConsentSelection,
  MarketingConsentSettings
} from './types/marketing-consent';

export function consentAvailability (settings?: MarketingConsentSettings): ConsentAvailability {
  return {
    email: Boolean(settings?.emailConsentLabel?.trim()),
    sms: Boolean(settings?.smsEnabled && settings?.smsConsentLabel?.trim())
  };
}

export function emailKey (email: string): string {
  return (email || '').trim().toLowerCase();
}

export function consentPayload (
  settings: MarketingConsentSettings | undefined,
  selection: ConsentSelection | null,
  email: string
): ConsentPayload | undefined {
  const offered = consentAvailability(settings);

  if (!offered.email && !offered.sms) {
    return undefined;
  }

  const key = emailKey(email);
  const matches = Boolean(selection && key && key === emailKey(selection.email));
  const payload: ConsentPayload = {};

  if (offered.email) {
    payload.email = matches && selection?.emailConsent === true;
  }

  if (offered.sms) {
    payload.sms = matches && selection?.smsConsent === true;

    if (payload.sms && selection) {
      payload.phone = selection.phone;
    }
  }

  return payload;
}

export function applyConsentToOrder<T extends ConsentOrder> (
  order: T,
  settings: MarketingConsentSettings | undefined,
  selection: ConsentSelection | null
): T {
  const consent = consentPayload(settings, selection, order.personalDetails.emailAddress);

  if (!consent) {
    return order;
  }

  order.addressInformation.paymentExtraFields = {
    ...order.addressInformation.paymentExtraFields,
    budsies_marketing_consent: consent
  };

  return order;
}
