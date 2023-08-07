import CurrentState from '../models/current-state.model';
import ParticipantData from '../models/participant-data.model';
import Ticket from '../models/ticket.model';

export interface StoreState {
  currentState?: CurrentState,
  participantData?: ParticipantData,
  lastWinningTickets: Ticket[],
  referrerCode?: string,
  isSynced: boolean
}
