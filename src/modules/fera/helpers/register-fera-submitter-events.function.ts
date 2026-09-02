import { getFeraReviewIdentifiers } from './get-fera-review-identifiers.function';

interface FeraEventApi {
  on: (eventName: string, callback: (event: unknown) => void) => void;
}

interface FeraWindow {
  fera?: unknown;
  setTimeout: Window['setTimeout'];
}

interface FeraSubmitterEventHandlers {
  onSubmit: (event: unknown) => void;
  onHide: (event: unknown) => void;
}

const RETRY_INTERVAL_MS = 100;
const RETRY_TIMEOUT_MS = 30_000;

function isFeraEventApi (fera: unknown): fera is FeraEventApi {
  return Boolean(fera) && typeof (fera as FeraEventApi).on === 'function';
}

/**
 * The Fera script replaces its bootstrap queue asynchronously. Wait until its
 * event API is available before subscribing to submitter lifecycle events.
 */
export function registerFeraSubmitterEvents (
  handlers: FeraSubmitterEventHandlers,
  feraWindow: FeraWindow = window
): void {
  const startedAt = Date.now();

  const register = (): void => {
    if (isFeraEventApi(feraWindow.fera)) {
      feraWindow.fera.on('submitter.submit', handlers.onSubmit);
      feraWindow.fera.on('submitter.hide', handlers.onHide);
      feraWindow.fera.on('submitter.complete', (submitter) => {
        console.log(submitter)
        const { reviewId, submissionId } = getFeraReviewIdentifiers(submitter);
        console.log(reviewId, submissionId);
      });

      return;
    }

    if (Date.now() - startedAt >= RETRY_TIMEOUT_MS) {
      return;
    }

    feraWindow.setTimeout(register, RETRY_INTERVAL_MS);
  };

  register();
}
