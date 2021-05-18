import config from 'config'
import { removeStoreCodeFromRoute } from '@vue-storefront/core/lib/multistore'
import storeCodeFromRoute from '@vue-storefront/core/lib/storeCodeFromRoute'
import get from 'lodash-es/get'

export const forStoryblok = async ({ dispatch, rootState }, { url, params }) => {
  if (params && params._storyblok_c && params._storyblok_c === 'page') {
    return {
      name: 'storyblok-page'
    }
  }
  if (params && params._storyblok_c && params._storyblok_c === 'block') {
    return {
      name: 'storyblok-block',
      meta: { layout: 'empty' }
    }
  }
  url = url.replace(/\/?(\?.*)?$/, '') // remove trailing slash and/or qs variables if present
  const storeCode = storeCodeFromRoute(url)
  const addStoreCode = get(config, 'storyblok.settings.appendStoreCodeFromHeader')
  const storeCodeToAdd = rootState.storyblok.storeCode
  if (addStoreCode && storeCodeToAdd) {
    url = `${storeCodeToAdd}/${(url || 'home')}`
  }
  if (config.storeViews.multistore && storeCode && url.replace(/\/$/, '') === removeStoreCodeFromRoute(url)) {
    url = `${url}/home`
  }
  const story = await dispatch(`storyblok/loadStory`, { fullSlug: url }, { root: true })
  if (story && story.full_slug) {
    return {
      name: 'storyblok-page',
      params: {
        slug: story.full_slug
      }
    }
  }
}