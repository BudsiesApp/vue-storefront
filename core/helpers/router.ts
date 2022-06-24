import rootStore from '@vue-storefront/core/store';
import VueRouter, { RouteConfig } from 'vue-router'
import { RouterManager } from '@vue-storefront/core/lib/router-manager'
import { ErrorHandler, RawLocation, Route } from 'vue-router/types/router'
import { once } from '@vue-storefront/core/helpers'

once('__VUE_EXTEND_PUSH_RR__', () => {
  const originalPush = VueRouter.prototype.push
  VueRouter.prototype.push = function push (location: RawLocation, onComplete: Function = () => {}, onAbort?: ErrorHandler): Promise<Route> {
    // TODO temporary solution because some links from storyblok pages has urls without slash at the end. And with strict option in routes, this will lead to 404 page.
    if (typeof location === 'string') {
      const [path, query] = location.split('?');
      const hasQuery = query && query.length;

      if (!path.endsWith('/')) {
        location = `${location}/${hasQuery ? `?${query}` : ''}`;
      }
    } else if (location.path && !location.path.endsWith('/')) {
      location.path = `${location.path}/`
    }

    if (onComplete || onAbort) return originalPush.call(this, location, onComplete, onAbort)
    return originalPush.call(this, location).catch(err => err)
  }
})

export const createRouter = (): VueRouter => {
  return new VueRouter({
    mode: 'history',
    base: __dirname,
    scrollBehavior: (to, from) => {
      if (to.hash) {
        return {
          selector: to.hash
        }
      }
      if (rootStore.getters['url/isBackRoute']) {
        const { scrollPosition = { x: 0, y: 0 } } = rootStore.getters['url/getCurrentRoute']
        return scrollPosition
      } else if (to.path !== from.path) { // do not change scroll position when navigating on the same page (ex. change filters)
        return { x: 0, y: 0 }
      }
    }
  })
}

export const createRouterProxy = (router: VueRouter): VueRouter => {
  const ProxyConstructor = Proxy || require('proxy-polyfill/src/proxy')

  return new ProxyConstructor(router, {
    get (target, propKey) {
      const origMethod = target[propKey]

      if (propKey === 'addRoutes') {
        return function (routes: RouteConfig[], ...args): void {
          return RouterManager.addRoutes(routes, ...args)
        }
      }

      return origMethod
    }
  })
}
