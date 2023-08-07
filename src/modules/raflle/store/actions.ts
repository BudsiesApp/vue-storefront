import { ActionTree } from 'vuex';
import config from 'config';

import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import { TaskQueue } from '@vue-storefront/core/lib/sync';
import { processURLAddress } from '@vue-storefront/core/helpers'
import RootState from '@vue-storefront/core/types/RootState';
import { StorageManager } from '@vue-storefront/core/lib/storage-manager';

import CurrentState from '../models/current-state.model';
import ParticipantData from '../models/participant-data.model';
import Ticket from '../models/ticket.model';
import { StoreState } from '../types/store-state.interface';
import { FETCH_CURRENT_STATE, FETCH_PARTICIPANT_BY_ID, FETCH_WINNING_TICKETS, REGISTER, SYNCHRONIZE, VERIFY_TOKEN } from '../types/action';
import { GET_IS_SYNCED, GET_LAST_WINNING_TICKETS, GET_REFERRER_TOKEN } from '../types/getter';
import { CURRENT_STATE_SET, LAST_WINNING_TICKETS_SET, PARTICIPANT_DATA_SET } from '../types/mutation';
import { TokenStatusValue } from '../types/token-status.value';
import { SN_RAFFLE } from '../types/store-name';
import { RAFFLE_MODULE_SYNCED_EVENT_NAME } from '../types/event';
import { SET_IS_SYNCED } from 'src/modules/promotion-platform/types/StoreMutations';

const baseRaffleUrl = `${config.budsies.endpoint}/raffle`;

export const actions: ActionTree<StoreState, RootState> = {
  async [FETCH_CURRENT_STATE] (_, { commit }): Promise<CurrentState> {
    const url = processURLAddress(`${baseRaffleUrl}/states/current`);

    const { result, resultCode } = await TaskQueue.execute({
      url,
      payload: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        method: 'GET'
      },
      silent: true
    });

    if (resultCode !== 200) {
      throw new Error(`Error while fetch raffle current state`);
    }

    const currentState = new CurrentState(result.capacity, result.nextDrawing);

    commit(CURRENT_STATE_SET, currentState);

    return currentState;
  },
  async [REGISTER] ({
    email,
    firstName,
    lastName
  }: {
    email: string,
    firstName: string,
    lastName: string
  }, { commit, getters }): Promise<ParticipantData> {
    const url = processURLAddress(`${baseRaffleUrl}/registrations`);
    const referrerCode = getters[GET_REFERRER_TOKEN];

    const data = {
      email,
      lastName,
      firstName,
      referrerCode
    };

    const { result, resultCode } = await TaskQueue.execute({
      url,
      payload: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        method: 'POST',
        body: JSON.stringify(data)
      },
      silent: false
    });

    if (resultCode !== 200) {
      throw new Error(`Error while raffle registration`);
    }

    const participantData = new ParticipantData(
      result.participantId,
      result.referralLink,
      result.tickets,
      result.token,
      result.isWinner
    );

    commit(PARTICIPANT_DATA_SET, participantData);

    return participantData;
  },
  async [FETCH_PARTICIPANT_BY_ID] (participantId, { commit }): Promise<ParticipantData> {
    const url = processURLAddress(`${baseRaffleUrl}/participants/${participantId}`);

    const { result, resultCode } = await TaskQueue.execute({
      url,
      payload: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        method: 'GET'
      },
      silent: false
    });

    if (resultCode !== 200) {
      throw new Error(`Error while fetch participant by id`);
    }

    const participantData = new ParticipantData(
      result.participantId,
      result.referralLink,
      result.tickets,
      result.token,
      result.isWinner
    );

    commit(PARTICIPANT_DATA_SET, participantData);

    return participantData;
  },
  async [FETCH_WINNING_TICKETS] (
    { useCache = true }: {useCache: boolean},
    { commit, getters }
  ): Promise<Ticket[]> {
    const url = processURLAddress(`${baseRaffleUrl}/tickets/winning`);
    const fetchedWinningTickets = getters[GET_LAST_WINNING_TICKETS];

    if (fetchedWinningTickets.length && useCache) {
      return fetchedWinningTickets;
    }

    const { result, resultCode } = await TaskQueue.execute({
      url,
      payload: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        method: 'GET'
      },
      silent: true
    });

    if (resultCode !== 200) {
      throw new Error(`Error while fetch winning tickets`);
    }

    commit(LAST_WINNING_TICKETS_SET, result);

    return result;
  },
  async [VERIFY_TOKEN] (token: string, { commit }): Promise<boolean> {
    const url = processURLAddress(`${baseRaffleUrl}/tokenVerificationRequests`);

    const { result, resultCode } = await TaskQueue.execute({
      url,
      payload: {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        method: 'POST',
        body: JSON.stringify({
          token
        })
      },
      silent: false
    });

    if (resultCode !== 200) {
      throw new Error(`Error while fetch participant by id`);
    }

    if (result.status === TokenStatusValue.NOT_FOUND) {
      commit(PARTICIPANT_DATA_SET, undefined);
      return false;
    }

    const participantData = new ParticipantData(
      result.participantId,
      result.referralLink,
      result.tickets,
      result.token,
      result.isWinner
    );

    commit(PARTICIPANT_DATA_SET, participantData);

    return true;
  },
  async [SYNCHRONIZE] ({ getters, commit, dispatch }): Promise<void> {
    if (getters[GET_IS_SYNCED]) {
      return;
    }

    const raffleStorage = StorageManager.get(SN_RAFFLE);

    const token = raffleStorage.getItem('raffle-token');
    const participantId = raffleStorage.getItem('participant-id');

    if (token) {
      const isFound = await dispatch(VERIFY_TOKEN, token);

      if (isFound) {
        commit(SET_IS_SYNCED, true);
        EventBus.$emit(RAFFLE_MODULE_SYNCED_EVENT_NAME);
        return;
      }
    }

    if (participantId) {
      await dispatch(FETCH_PARTICIPANT_BY_ID, participantId);
    }

    commit(SET_IS_SYNCED, true);
    EventBus.$emit(RAFFLE_MODULE_SYNCED_EVENT_NAME);
  }
}
