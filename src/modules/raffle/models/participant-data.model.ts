import Ticket from './ticket.model';

export default class ParticipantData {
  public constructor (
    public readonly participantId: number,
    public readonly referralLink: string,
    public readonly tickets: Ticket[],
    public readonly token: string,
    public readonly isWinner: boolean
  ) {
    [participantId, referralLink, tickets, token, isWinner].forEach((arg, index) => {
      if (arg === undefined) {
        throw new Error(`Undefined value passed at position: ${index}`);
      }
    });
  }
}
