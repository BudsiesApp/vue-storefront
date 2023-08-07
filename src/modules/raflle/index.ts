import { isServer } from '@vue-storefront/core/helpers';
import { StorefrontModule } from '@vue-storefront/core/lib/modules';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

import Ticket from './models/ticket.model';
import { raffleStore } from './store';
import { SYNCHRONIZE } from './types/action';
import { SN_RAFFLE } from './types/store-name';
import { cacheHandlerFactory } from './helpers/cache-handler.factory';

export const RaffleModule: StorefrontModule = async function ({ store }) {
  StorageManager.init(SN_RAFFLE);
  store.registerModule(SN_RAFFLE, raffleStore);

  if (!isServer) {
    await store.dispatch(SYNCHRONIZE);

    store.subscribe(cacheHandlerFactory());
  }
}

export {
  Ticket
}
