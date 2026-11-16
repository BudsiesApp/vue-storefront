export default class TaskResponseError extends Error {
  public constructor (message: string, public readonly status: number) {
    super(message);
    this.name = 'TaskResponseError';
  }
}
