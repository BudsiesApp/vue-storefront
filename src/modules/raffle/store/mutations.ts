import Vue from 'vue';
import { MutationTree } from 'vuex';

import { CURRENT_STATE_SET, IS_SYNCED_SET, LAST_WINNING_TICKETS_SET, PARTICIPANT_DATA_SET, REFERRER_TOKEN_SET } from '../types/mutation';
import { StoreState } from '../types/store-state.interface';
import ParticipantData from '../models/participant-data.model';
import CurrentState from '../models/current-state.model';

export const mutations: MutationTree<StoreState> = {
  [PARTICIPANT_DATA_SET] (
    state: StoreState,
    value?: ParticipantData
  ): void {
    Vue.set(state, 'participantData', value);
  },
  [CURRENT_STATE_SET] (state: StoreState, payload: CurrentState): void {
    Vue.set(state, 'currentState', payload);
  },
  [REFERRER_TOKEN_SET] (
    state: StoreState,
    value?: string
  ): void {
    Vue.set(state, 'referrerToken', value);
  },
  [LAST_WINNING_TICKETS_SET] (state: StoreState, payload: string[]): void {
    state.lastWinningTickets = payload;
  },
  [IS_SYNCED_SET] (state: StoreState, payload: boolean): void {
    state.isSynced = payload
  }
}
