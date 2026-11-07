export function getApiErrorMessage (result: unknown, fallbackMessage: string): string {
  const errorMessage = (result as { errorMessage?: unknown } | undefined)?.errorMessage;

  if (typeof errorMessage !== 'string' || !errorMessage.trim()) {
    return fallbackMessage;
  }

  return errorMessage;
}
