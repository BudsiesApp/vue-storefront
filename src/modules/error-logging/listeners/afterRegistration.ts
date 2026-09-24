import unhandledRejectionHandler from './unhandledRejectionHandler';
import windowOnErrorHandler from './windowOnErrorHandler';
import consoleError from './consoleError';
import { restoreMessagesFromStorage } from '../services/sentMessagesKeeper';
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { REPORT_ERROR, ReportedError } from 'src/modules/shared';
import logError from '../services/errorLogger';

export async function afterRegistration (config: any): Promise<void> {
  if (!config.errorLogging.serviceUrl) {
    return;
  }

  await restoreMessagesFromStorage();

  EventBus.$on(REPORT_ERROR, (errorMessage: ReportedError) => {
    logError(errorMessage).catch(() => {});
  });

  window.addEventListener('unhandledrejection', unhandledRejectionHandler);
  window.addEventListener('error', windowOnErrorHandler);
  console.error = consoleError;
}
