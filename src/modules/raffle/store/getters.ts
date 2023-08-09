import { GetterTree } from 'vuex';
import RootState from '@vue-storefront/core/types/RootState'

import { StoreState } from '../types/store-state.interface';
import { GET_CURRENT_STATE, GET_IS_SYNCED, GET_LAST_WINNING_TICKETS, GET_PARTICIPANT_DATA, GET_REFERRER_TOKEN } from '../types/getter';
import ParticipantData from '../models/participant-data.model';
import CurrentState from '../models/current-state.model';
import Ticket from '../models/ticket.model';

export const getters: GetterTree<StoreState, RootState> = {
  [GET_REFERRER_TOKEN] (state): string | undefined {
    return state.referrerToken;
  },
  [GET_PARTICIPANT_DATA] (state): ParticipantData | undefined {
    return state.participantData;
  },
  [GET_CURRENT_STATE] (state): CurrentState | undefined {
    return state.currentState;
  },
  [GET_LAST_WINNING_TICKETS] (state): string[] {
    return state.lastWinningTickets;
  },
  [GET_IS_SYNCED] (state): boolean {
    return state.isSynced;
  }
}
