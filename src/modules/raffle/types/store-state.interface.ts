import CurrentState from '../models/current-state.model';
import ParticipantData from '../models/participant-data.model';

export interface StoreState {
  currentState?: CurrentState,
  participantData?: ParticipantData,
  lastWinningTickets: string[],
  referrerToken?: string,
  isSynced: boolean
}
