export class ProcessOrderError extends Error {
  constructor(message: string, public code: number) {
    super(message);
  }
}