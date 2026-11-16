export default interface ErrorMessage {
  shortMessage: string,
  fullMessage: string,
  currentUrl: string,
  line?: number,
  file?: string,
  context?: Record<string, string | number>
}
