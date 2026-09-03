export interface FeraMediaConsent {
  reviewId: string;
  consentTextVersion: string;
  customerId?: string;
}

export interface FeraMediaConsentRequest {
  review_id: string;
  consent_text_version: string;
  customer_id?: string;
  quote_id?: string;
}
