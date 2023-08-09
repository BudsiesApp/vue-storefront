import { isServer } from '@vue-storefront/core/helpers';
import { StorefrontModule } from '@vue-storefront/core/lib/modules';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

import Ticket from './models/ticket.model';
import { raffleStore } from './store';
import * as actions from './types/action';
import * as getters from './types/getter';
import { SN_RAFFLE } from './types/store-name';
import { cacheHandlerFactory } from './helpers/cache-handler.factory';
import { RAFFLE_MODULE_SYNCED_EVENT_NAME } from './types/event';

import RafflePending from './components/pending.vue';
import RaffleRegistrationForm from './components/registration-form.vue';
import RaffleWinner from './components/winner.vue';

export const RaffleModule: StorefrontModule = async function ({ store }) {
  StorageManager.init(SN_RAFFLE);
  store.registerModule(SN_RAFFLE, raffleStore);

  if (!isServer) {
    await store.dispatch(actions.SYNCHRONIZE);

    store.subscribe(cacheHandlerFactory());
  }
}

export {
  actions,
  getters,
  Ticket,
  SN_RAFFLE,
  RAFFLE_MODULE_SYNCED_EVENT_NAME,
  RafflePending,
  RaffleRegistrationForm,
  RaffleWinner
}
