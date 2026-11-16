import { hydrateInPreviewOrWhenVisible } from '../helpers/hydrate-in-preview-only-or-when-visible.function'

export const components = {
  debug: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Debug.vue'),
  page: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Page.vue'),
  block: hydrateInPreviewOrWhenVisible(() => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Block.vue')),
  category_description: hydrateInPreviewOrWhenVisible(() => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Block.vue')),
  product_description: hydrateInPreviewOrWhenVisible(() => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Block.vue')),
  block_reference: hydrateInPreviewOrWhenVisible(() => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/BlockReference.vue')),
  grid: hydrateInPreviewOrWhenVisible(() => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Grid.vue')),
  column: hydrateInPreviewOrWhenVisible(() => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Column.vue')),
  page_section: hydrateInPreviewOrWhenVisible(() => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/PageSection.vue')),
  tile: () => import(/* webpackChunkName: "vsf-storyblok" */ './defaults/Tile.vue')
}

export enum StoryblokComponentGroup {
  DEFAULT = 'default',
  CORE = 'core'
}

interface RegistrationOptions {
  force?: boolean;
  group?: StoryblokComponentGroup;
}

const componentGroups: Record<string, StoryblokComponentGroup> = Object.fromEntries(
  Object.keys(components).map(componentKey => [componentKey, StoryblokComponentGroup.CORE])
)

export async function loadStoryblokComponentGroup (group: StoryblokComponentGroup): Promise<void> {
  await Promise.all(Object.keys(components)
    .filter(componentKey => componentGroups[componentKey] === group && typeof components[componentKey] === 'function')
    .map(componentKey => components[componentKey]()))
}

export function add (key: string, component: any, options: RegistrationOptions = {}) {
  if (components[key] && !options.force) {
    // eslint-disable-next-line no-console
    console.log(`Component with key ${key} already exists, skipping...`)

    return
  }

  components[key] = component
  componentGroups[key] = options.group ?? StoryblokComponentGroup.DEFAULT
}

export { default as Blok } from './Blok'
