import { MutationTree } from 'vuex';

import { FeraMediaConsent } from '../types/fera-media-consent.interface';
import { FeraState } from './state';

export const SET_PENDING_MEDIA_CONSENT = 'SET_PENDING_MEDIA_CONSENT';
export const CLEAR_PENDING_MEDIA_CONSENT = 'CLEAR_PENDING_MEDIA_CONSENT';

export const mutations: MutationTree<FeraState> = {
  [SET_PENDING_MEDIA_CONSENT] (state, consent: FeraMediaConsent): void {
    state.pendingMediaConsent = consent;
  },
  [CLEAR_PENDING_MEDIA_CONSENT] (state): void {
    state.pendingMediaConsent = null;
  }
};
