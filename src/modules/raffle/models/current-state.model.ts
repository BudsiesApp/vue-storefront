export default class CurrentState {
  public constructor (
    public readonly capacity: number,
    public readonly nextDrawing: string
  ) {
    [capacity, nextDrawing].forEach((arg, index) => {
      if (arg === undefined) {
        throw new Error(`Undefined value passed at position: ${index}`);
      }
    });
  }
}
