export const components = {
  debug: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Debug.vue'),
  page: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Page.vue'),
  block: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Block.vue'),
  category_description: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Block.vue'),
  product_description: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Block.vue'),
  block_reference: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/BlockReference.vue'),
  grid: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Grid.vue'),
  column: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Column.vue'),
  page_section: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/PageSection.vue'),
  tile: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Tile.vue')
}

export function add (key: string, component: any, options: any = {}) {
  if (components[key] && !options.force) {
    // eslint-disable-next-line no-console
    console.log(`Component with key ${key} already exists, skipping...`)
    return
  }
  components[key] = component
}

export { default as Blok } from './Blok'
