export const components = {
  debug: () => import('./defaults/Debug.vue'),
  page: () => import('./defaults/Page.vue'),
  block: () => import('./defaults/Block.vue'),
  block_reference: () => import('./defaults/BlockReference.vue'),
  grid: () => import('./defaults/Grid.vue'),
  column: () => import('./defaults/Column.vue'),
  page_section: () => import('./defaults/PageSection.vue'),
  tile: () => import('./defaults/Tile.vue')
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
