import { TicketStatusValue } from '../types/ticket-status.value';

export default class Ticket {
  public constructor (
    public readonly code: string,
    public readonly status?: TicketStatusValue
  ) {
    if (code === undefined) {
      throw new Error('Code is not defined');
    }
  }
}
