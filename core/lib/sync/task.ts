import i18n from '@vue-storefront/i18n'
import fetch from 'isomorphic-fetch'
import rootStore from '@vue-storefront/core/store'
import { adjustMultistoreApiUrl, currentStoreView } from '@vue-storefront/core/lib/multistore'
import EventBus from '@vue-storefront/core/compatibility/plugins/event-bus'
import Task from '@vue-storefront/core/lib/sync/types/Task'
import { isServer } from '@vue-storefront/core/helpers'
import { Logger } from '@vue-storefront/core/lib/logger'
import { TaskQueue } from '@vue-storefront/core/lib/sync'
import * as entities from '@vue-storefront/core/lib/store/entities'
import { StorageManager } from '@vue-storefront/core/lib/storage-manager'
import { processURLAddress } from '@vue-storefront/core/helpers'
import { serial } from '@vue-storefront/core/helpers'
import config from 'config'
import { onlineHelper } from '@vue-storefront/core/helpers'
import { hasResponseError, getResponseMessage } from '@vue-storefront/core/lib/sync/helpers'
import queryString from 'query-string'

import { BEFORE_STORE_BACKEND_API_REQUEST } from 'src/modules/shared'
import { RESET_USER_TOKEN_REFRESH_COUNT } from '@vue-storefront/core/modules/user'

export function _prepareTask (task) {
  const taskId = entities.uniqueEntityId(task) // timestamp as a order id is not the best we can do but it's enough
  task.task_id = taskId.toString()
  task.transmited = false
  task.created_at = new Date()
  task.updated_at = new Date()
  return task
}

function getUrl (task, currentToken, currentCartId) {
  let url = task.url
    .replace('{{token}}', (currentToken == null) ? '' : currentToken)
    .replace('{{cartId}}', (currentCartId == null) ? '' : currentCartId)

  url = processURLAddress(url); // use relative url paths
  if (config.storeViews.multistore) {
    url = adjustMultistoreApiUrl(url)
  }

  if (config.users.tokenInHeader) {
    const parsedUrl = queryString.parseUrl(url)
    delete parsedUrl['query']['token']
    url = queryString.stringifyUrl(parsedUrl)
  }

  return url
}

function getPayload (task, currentToken) {
  const payload = {
    ...task.payload,
    headers: {
      ...task.payload.headers,
      ...(config.users.tokenInHeader ? { authorization: `Bearer ${currentToken}` } : {})
    }
  }
  return payload
}

async function _internalExecute(
  task: Task,
): Promise<Task> {
  const currentCartId = !isServer ? rootStore.getters['cart/getCartToken'] : null;
  const isCartIdRequired = task.url.includes('{{cartId}}') // this is bypass for #2592

  if (isCartIdRequired && !currentCartId) { // by some reason we does't have the  cart id yet
    throw new Error('Error executing sync task ' + task.url + ' the required cartId  argument is null. Re-creating shopping cart synchro.')
  }

  const tokenRefreshPromise = rootStore.getters['user/getTokenRefreshPromise'];
  
  if (tokenRefreshPromise) {
    await tokenRefreshPromise;
  }

  const currentToken = !isServer ? rootStore.getters['user/getUserToken'] : null;

  const url = getUrl(task, currentToken, currentCartId)
  const payload = getPayload(task, currentToken)

  Logger.info('Executing sync task ' + url, 'sync', task)()

  EventBus.$emit(BEFORE_STORE_BACKEND_API_REQUEST, payload);

  let response: Response;
  
  try {
    response = await fetch(url, payload);
  } catch (error) {
    Logger.error(error, 'sync')();
    throw error;
  }

  const contentType = response.headers.get('content-type')
  let jsonResponse;

  if (contentType && contentType.includes('application/json')) {
    jsonResponse = await response.json();
  } else {
    const msg = i18n.t('Error with response - bad content-type!').toString();
    Logger.error(msg, 'sync')();
    throw new Error(msg);
  }

  if (!jsonResponse) {
    const msg = i18n.t('Unhandled error, wrong response format!').toString();
    Logger.error(msg, 'sync')();
    throw new Error(msg);
  }

  const responseCode = parseInt(jsonResponse.code)

  if (responseCode === 401) {
    const isRefreshed: boolean = await rootStore.dispatch(
      'user/tryToRefreshToken'
    );

    if (isRefreshed) {
      return _internalExecute(task);
    } else {
      TaskQueue.clearNotTransmited();
    }
  } else {
    rootStore.commit(RESET_USER_TOKEN_REFRESH_COUNT);
  }

  if (
    responseCode !== 200 &&
    !task.silent &&
    jsonResponse.result &&
    hasResponseError(jsonResponse)
  ) {
    rootStore.dispatch('notification/spawnNotification', {
      type: 'error',
      message: i18n.t(getResponseMessage(jsonResponse)),
      action1: { label: i18n.t('OK') }
    });
  }

  Logger.debug('Response for: ' + task.task_id + ' = ' + JSON.stringify(jsonResponse.result), 'sync')()
  task.transmited = true
  task.transmited_at = new Date()
  task.result = jsonResponse.result
  task.resultCode = jsonResponse.code
  task.code = jsonResponse.code // backward compatibility to fetch()
  task.acknowledged = false
  task.meta = jsonResponse.meta

  if (task.callback_event) {
    if (task.callback_event.startsWith('store:')) {
      rootStore.dispatch(task.callback_event.split(':')[1], task)
    } else {
      EventBus.$emit(task.callback_event, task)
    }
  }

  return task;
}

export function execute (task: Task): Promise<Task> {
  return _internalExecute(task);
}

export function initializeSyncTaskStorage () {
  const storeView = currentStoreView()
  const dbNamePrefix = storeView.storeCode ? storeView.storeCode + '-' : ''

  StorageManager.init('syncTasks')
}

export function registerSyncTaskProcessor () {
  const mutex = {}
  EventBus.$on('sync/PROCESS_QUEUE', async data => {
    if (onlineHelper.isOnline) {
      // event.data.config - configuration, endpoints etc
      const syncTaskCollection = StorageManager.get('syncTasks')
      const currentUserToken = rootStore.getters['user/getUserToken']
      const currentCartToken = rootStore.getters['cart/getCartToken']

      const fetchQueue = []
      Logger.debug('Current User token = ' + currentUserToken)()
      Logger.debug('Current Cart token = ' + currentCartToken)()
      syncTaskCollection.iterate((task, id) => {
        if (task && !task.transmited && !mutex[id]) { // not sent to the server yet
          mutex[id] = true // mark this task as being processed
          fetchQueue.push(execute(task).then(executedTask => {
            if (!executedTask.is_result_cacheable) {
              syncTaskCollection.removeItem(id) // remove successfully executed task from the queue
            } else {
              syncTaskCollection.setItem(id, executedTask) // update the 'transmitted' field
            }
            mutex[id] = false
          }).catch(err => {
            mutex[id] = false
            Logger.error(err)()
          }))
        }
      }, (err) => {
        if (err) Logger.error(err)()
        Logger.debug('Iteration has completed')()
        // execute them serially
        serial(fetchQueue)
        Logger.debug('Processing sync tasks queue has finished')()
      })
    }
  })
}
