export interface FeraMediaConsent {
  reviewId: string;
  consentTextVersion: string;
}

export interface FeraMediaConsentRequest {
  review_id: string;
  consent_text_version: string;
  customer_id?: string | number;
  quote_id?: string;
}
