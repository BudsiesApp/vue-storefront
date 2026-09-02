import { FeraMediaConsent } from '../types/fera-media-consent.interface';

export interface FeraState {
  pendingMediaConsent: FeraMediaConsent | null;
}

export const state = (): FeraState => ({
  pendingMediaConsent: null
});
