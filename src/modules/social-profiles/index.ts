import { StorefrontModule } from '@vue-storefront/core/lib/modules';
import { module } from './store';
import { SOCIAL_PROFILES_STORE } from './types/Store';

export { SocialNetwork } from './types/SocialNetwork';
export {
  SOCIAL_PROFILES_STORE,
  LOAD_SOCIAL_PROFILES_ACTION,
  GET_SOCIAL_PROFILES_GETTER,
  SET_SOCIAL_PROFILES_MUTATION
} from './types/Store';
export type { SocialProfile } from './normalize';

export const SocialProfilesModule: StorefrontModule = async function ({ store }) {
  store.registerModule(SOCIAL_PROFILES_STORE, module);
};
