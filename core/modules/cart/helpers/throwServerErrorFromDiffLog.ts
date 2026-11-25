import i18n from '@vue-storefront/core/i18n';
import ServerError from 'src/modules/shared/types/server-error';

import { ServerResponse } from '../types/DiffLog';

const successStatusCode = '200';

export default function throwServerErrorFromDiffLog (diffLog: any) {
  diffLog.serverResponses.forEach((response: ServerResponse) => {
    if (response.status.toString() !== successStatusCode) {
      const message = response.status.toString() === '404'
        ? i18n.t('Your cart is no longer available. Please add your items again.')
        : response?.result?.result || i18n.t('Something went wrong');
      throw new ServerError(message);
    }
  });
}
