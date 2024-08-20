import config from 'config'
import { processURLAddress } from '@vue-storefront/core/helpers'
import { TaskQueue } from '@vue-storefront/core/lib/sync';

import GiftCard from './types/GiftCard';
import GiftCardTemplate from './types/GiftCardTemplate.interface';
import { Dictionary } from '../budsies';

function getQueryString (cartId?: string, userToken?: string) {
  const query = new URLSearchParams();

  if (cartId) {
    query.append('cartId', cartId);
  }

  if (userToken) {
    query.append('token', userToken)
  }

  return query.toString();
}

export const GiftCardService = {
  async applyGiftCardCode (code: string, cartId?: string, userToken?: string): Promise<GiftCard> {
    let url = processURLAddress(`${config.budsies.endpoint}/giftcards/apply`);
    const queryString = getQueryString(cartId, userToken);

    if (queryString) {
      url += `?${queryString}`;
    }

    const result = await TaskQueue.execute({
      url,
      payload: {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        mode: 'cors',
        method: 'POST',
        body: JSON.stringify({ code })
      },
      silent: true
    });

    // TODO check why request errors not throwing
    if (Number.isNaN(Number.parseFloat(result.result))) {
      throw new Error(result.result.errorMessage);
    }

    return {
      code,
      value: Number.parseFloat(result.result)
    }
  },
  async changeAppliedGiftCardValue (
    code: string,
    value: number,
    cartId?: string,
    userToken?: string
  ): Promise<GiftCard> {
    let url = processURLAddress(`${config.budsies.endpoint}/giftcards/change-value`);
    const queryString = getQueryString(cartId, userToken);

    if (queryString) {
      url += `?${queryString}`;
    }

    const result = await TaskQueue.execute({
      url,
      payload: {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        mode: 'cors',
        method: 'POST',
        body: JSON.stringify({ code, value })
      },
      silent: true
    });

    if (result.code === 500) {
      throw new Error('Gift Card value was not changed');
    }

    return {
      code,
      value: result.result
    }
  },
  async loadGiftCardsTemplates (storeId: number, userToken?: string): Promise<GiftCardTemplate[]> {
    let url = processURLAddress(`${config.budsies.endpoint}/giftcards/templates`);
    const query = new URLSearchParams();

    query.append('storeId', storeId.toString(10));

    if (userToken) {
      query.append('token', userToken)
    }

    url += `?${query.toString()}`;

    const result = await TaskQueue.execute({
      url,
      payload: {
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        method: 'GET'
      },
      silent: true
    });

    return result.result;
  },
  async pullAppliedGiftCards (cartId?: string, userToken?: string): Promise<GiftCard[]> {
    let url = processURLAddress(`${config.budsies.endpoint}/giftcards/pull`);
    const queryString = getQueryString(cartId, userToken);

    if (queryString) {
      url += `?${queryString}`;
    }

    const result = await TaskQueue.execute({
      url,
      payload: {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        mode: 'cors',
        method: 'GET'
      },
      silent: true
    });

    return Object.entries(result.result as Dictionary<number>).map(([key, value]) => ({
      code: key,
      value: value
    }))
  },
  async removeAppliedGiftCards (codes: string[], cartId?: string, userToken?: string): Promise<void> {
    let url = processURLAddress(`${config.budsies.endpoint}/giftcards/remove`);
    const queryString = getQueryString(cartId, userToken);

    if (queryString) {
      url += `?${queryString}`;
    }

    await TaskQueue.execute({
      url,
      payload: {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        mode: 'cors',
        method: 'POST',
        body: JSON.stringify({ codes })
      },
      silent: true
    });
  }
}
