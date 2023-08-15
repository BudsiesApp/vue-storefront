import { isServer } from '@vue-storefront/core/helpers';
import { StorefrontModule } from '@vue-storefront/core/lib/modules';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import { cartHooks } from '@vue-storefront/core/modules/cart/hooks';

import CurrentState from './models/current-state.model';
import ParticipantData from './models/participant-data.model';
import Ticket from './models/ticket.model';
import { raffleStore } from './store';
import * as actions from './types/action';
import * as getters from './types/getter';
import * as mutations from './types/mutation';
import { SN_RAFFLE } from './types/store-name';
import { cacheHandlerFactory } from './helpers/cache-handler.factory';
import * as syncLocalStorageChange from './helpers/sync-local-storage-change';

import RafflePending from './components/pending.vue';
import RaffleRegistrationForm from './components/registration-form.vue';
import RaffleModalPreviousWinningTickets from './components/modal-previous-winning-tickets.vue';
import RaffleWinner from './components/winner.vue';

export const RaffleModule: StorefrontModule = async function ({ store }) {
  StorageManager.init(SN_RAFFLE);
  store.registerModule(SN_RAFFLE, raffleStore);

  if (!isServer) {
    store.subscribe(cacheHandlerFactory());
    syncLocalStorageChange.addEventListener();

    await store.dispatch(`${SN_RAFFLE}/${actions.SYNCHRONIZE}`);

    EventBus.$on('order-after-placed', () => {
      const participantData = store.getters[`${SN_RAFFLE}/${getters.GET_PARTICIPANT_DATA}`];

      if (!participantData || !participantData.token) {
        return;
      }

      store.dispatch(`${SN_RAFFLE}/${actions.VERIFY_TOKEN}`, participantData.token);
    });

    cartHooks.beforeAddToCart(({ cartItem }) => {
      const participantData = store.getters[`${SN_RAFFLE}/${getters.GET_PARTICIPANT_DATA}`];

      if (!participantData || !participantData.participantId) {
        return;
      }

      cartItem.participantId = participantData.participantId;

      return {
        cartItem
      }
    });
  }
}

export {
  actions,
  getters,
  mutations,
  CurrentState,
  Ticket,
  ParticipantData,
  RafflePending,
  RaffleRegistrationForm,
  RaffleModalPreviousWinningTickets,
  RaffleWinner,
  SN_RAFFLE
}
