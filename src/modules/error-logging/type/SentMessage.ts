export default class SentMessage {
  private static readonly EXPIRATION_TIMEOUT = 24 * 60 * 60 * 1000;
  private fExpirationTime: number;

  public constructor (public hash: string, expirationTime?: number) {
    if (expirationTime) {
      this.fExpirationTime = expirationTime;
      return;
    }

    this.fExpirationTime = this.getExpirationTime();
  }

  public get isExpired (): boolean {
    return this.fExpirationTime < Date.now();
  }

  private getExpirationTime (): number {
    return Date.now() + SentMessage.EXPIRATION_TIMEOUT;
  }
}
