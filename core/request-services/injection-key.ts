import { InjectionKey } from 'vue';

import { RequestServices } from './types';

export const requestServicesInjectionKey: InjectionKey<RequestServices> =
  Symbol.for('budsies.storefront.request-services');
