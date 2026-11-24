import { ConsentState } from '../types/store/state';

export const state = (): ConsentState => ({
  selection: null,
  hydrated: false
});
