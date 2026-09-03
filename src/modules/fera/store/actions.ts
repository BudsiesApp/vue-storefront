import { ActionTree } from 'vuex';

import { Logger } from '@vue-storefront/core/lib/logger';
import RootState from '@vue-storefront/core/types/RootState';

import { getFeraReviewIdentifiers } from '../helpers/get-fera-review-identifiers.function';
import { getUploadedFeraMedia } from '../helpers/get-uploaded-fera-media.function';
import { FeraMediaConsent, FeraMediaConsentRequest } from '../types/fera-media-consent.interface';
import { FERA_MEDIA_CONSENT_MODAL_NAME } from '../types/modal-name';
import { FERA_STORE_NAME } from '../types/store-name';
import { CLEAR_PENDING_MEDIA_CONSENT, SET_PENDING_MEDIA_CONSENT } from './mutations';
import { FeraState } from './state';

export const CAPTURE_SUBMITTED_REVIEW = 'captureSubmittedReview';
export const SHOW_MEDIA_CONSENT = 'showMediaConsent';
export const LOG_MEDIA_CONSENT = 'logMediaConsent';
export const CLEAR_MEDIA_CONSENT = 'clearMediaConsent';

export const FERA_MEDIA_CONSENT_TEXT_VERSION = 'v1';

function getMediaConsentRequest (
  consent: FeraMediaConsent,
  rootGetters: Record<string, unknown>
): FeraMediaConsentRequest {
  const request: FeraMediaConsentRequest = {
    review_id: consent.reviewId,
    consent_text_version: consent.consentTextVersion
  };
  const quoteId = rootGetters['cart/getCartToken'];

  if (consent.customerId) {
    request.customer_id = consent.customerId;
  } else if (typeof quoteId === 'string' && quoteId) {
    request.quote_id = quoteId;
  }

  return request;
}

export const actions: ActionTree<FeraState, RootState> = {
  [CAPTURE_SUBMITTED_REVIEW] ({ commit }, event: unknown): void {
    const uploadedMedia = getUploadedFeraMedia(event);

    if (uploadedMedia.length === 0) {
      commit(CLEAR_PENDING_MEDIA_CONSENT);
      return;
    }

    const { reviewId, submissionId, customerId } = getFeraReviewIdentifiers(event);
    const identifier = reviewId || submissionId;

    if (!identifier) {
      commit(CLEAR_PENDING_MEDIA_CONSENT);
      Logger.warn('Unable to identify Fera review submission with uploaded media.', FERA_STORE_NAME)();
      return;
    }

    commit(SET_PENDING_MEDIA_CONSENT, {
      reviewId: identifier,
      consentTextVersion: FERA_MEDIA_CONSENT_TEXT_VERSION,
      customerId
    });
  },
  [SHOW_MEDIA_CONSENT] ({ state, commit, dispatch }, event: unknown): Promise<unknown> | void {
    const pendingConsent = state.pendingMediaConsent;

    if (!pendingConsent) {
      return;
    }

    const { reviewId, submissionId, customerId } = getFeraReviewIdentifiers(event);
    const consent: FeraMediaConsent = {
      ...pendingConsent,
      reviewId: reviewId || pendingConsent.reviewId || submissionId,
      customerId: customerId || pendingConsent.customerId
    };

    commit(SET_PENDING_MEDIA_CONSENT, consent);

    return dispatch('ui/openModal', {
      name: FERA_MEDIA_CONSENT_MODAL_NAME,
      payload: consent
    }, { root: true });
  },
  [LOG_MEDIA_CONSENT] ({ rootGetters }, consent: FeraMediaConsent): void {
    const request = getMediaConsentRequest(consent, rootGetters);

    // Magento does not expose this endpoint yet. Keep the exact future request
    // payload visible during the proof of concept without sending a request.
    console.log('Fera media consent request (not sent):', request);
  },
  [CLEAR_MEDIA_CONSENT] ({ commit }): void {
    commit(CLEAR_PENDING_MEDIA_CONSENT);
  }
};
