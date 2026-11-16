import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { isServer } from '@vue-storefront/core/helpers';
import { Logger } from '@vue-storefront/core/lib/logger';
import { StorefrontModule } from '@vue-storefront/core/lib/modules';

import { PAGE_RENDERED } from 'src/modules/shared';

interface PopMechanicWindow extends Window {
  PopMechanic?: {
    update?: () => void
  }
}

export const MaestraModule: StorefrontModule = function ({ store }) {
  if (isServer) {
    return;
  }

  EventBus.$on(PAGE_RENDERED, () => {
    const popMechanic = (window as PopMechanicWindow).PopMechanic;
    const previousRoute = store.getters['url/getPrevRoute'];

    if (!previousRoute.fullPath) {
      return;
    }

    if (!popMechanic || typeof popMechanic.update !== 'function') {
      return;
    }

    try {
      popMechanic.update();
    } catch (error) {
      Logger.error(error, 'maestra')();
    }
  });
}
