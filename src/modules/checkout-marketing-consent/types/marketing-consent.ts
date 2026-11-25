export interface MarketingConsentSettings {
  emailConsentLabel?: string;
  smsConsentLabel?: string;
  smsEnabled?: boolean;
}

export interface ConsentAvailability {
  email: boolean;
  sms: boolean;
}

export interface MarketingSubscriptionRequest {
  orderId: number | string;
  email: string;
  emailConsent?: boolean;
  smsConsent?: boolean;
  phone?: string;
}

export interface MarketingConsentValue {
  emailConsent: boolean;
  smsConsent: boolean;
  phone: string;
}

export interface ConsentSelection extends MarketingConsentValue {
  email: string;
}

export interface ConsentPayload {
  email?: boolean;
  sms?: boolean;
  phone?: string;
}

export interface ConsentOrderPersonalDetails {
  emailAddress: string;
}

export interface ConsentOrderAddressInformation {
  paymentExtraFields?: Record<string, unknown>;
}

export interface ConsentOrder {
  personalDetails: ConsentOrderPersonalDetails;
  addressInformation: ConsentOrderAddressInformation;
}
