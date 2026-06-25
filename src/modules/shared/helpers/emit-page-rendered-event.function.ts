import Vue from 'vue';

import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus';
import { isServer } from '@vue-storefront/core/helpers';

import { PAGE_RENDERED } from '../types/page-rendered.event';

export async function emitPageRenderedEvent (): Promise<void> {
  if (isServer) {
    return;
  }

  await Vue.nextTick();

  setTimeout(() => {
    EventBus.$emit(PAGE_RENDERED);
  }, 0);
}
