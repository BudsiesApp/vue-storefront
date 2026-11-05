import config from 'config'
import { mapState } from 'vuex'
import { Logger } from '@vue-storefront/core/lib/logger'
import { currentStoreView } from '@vue-storefront/core/lib/multistore'
import { emitPageRenderedEvent } from 'src/modules/shared';
import { KEY } from '..'
import { waitForStoryblokContentRender } from '../helpers/wait-for-storyblok-content-render.function'
import { StoryblokState } from '../types/State'
import { loadScript, getStoryblokQueryParams } from '../helpers'
import get from 'lodash-es/get'
import { resolveParentData } from '../helpers/resolve-parent-data.function'

export default {
  name: 'Storyblok',
  computed: {
    ...mapState(KEY, {
      loadingStory (state: StoryblokState) {
        const { id, fullSlug } = getStoryblokQueryParams(this.$route)

        const key = this.storyblokPath || id || this.formatFullSlug(fullSlug)
        return (state.stories[key] && state.stories[key].loading) || false
      },
      previewToken: (state: StoryblokState) => state.previewToken,
      storeCodeFromHeader: (state: StoryblokState) => state.storeCode,
      story (state: StoryblokState) {
        const { id, fullSlug } = getStoryblokQueryParams(this.$route)

        const key = this.storyblokPath || id || this.formatFullSlug(fullSlug)
        return state.stories[key] && state.stories[key].story
      },
      isStatic () {
        return !!this.storyblok.path
      },
      storyblokPath () {
        const { storeCode } = currentStoreView()
        const path = this.storyblok.path
        if (this.storyblok.prependStorecode && config.storeViews.multistore && storeCode) {
          return `${storeCode}/${path}`
        }
        return path
      }
    })
  },
  data () {
    return {
      storyLoadId: 0,
      storyblok: {
        prependStorecode: false,
        path: '',
        fetchStory: true
      }
    }
  },
  methods: {
    formatFullSlug (fullSlug: string) {
      const addStoreCode = get(config, 'storyblok.settings.appendStoreCodeFromHeader')
      const storeCodeToAdd = this.storeCodeFromHeader
      if (addStoreCode && storeCodeToAdd) {
        return `${storeCodeToAdd}/${fullSlug}`
      }
      return fullSlug
    },
    async loadStoryAndEmitPageRendered () {
      const loadId = ++this.storyLoadId
      const { fullSlug } = getStoryblokQueryParams(this.$route)
      const storyFullSlug = this.storyblokPath || this.formatFullSlug(fullSlug)
      let story

      try {
        story = await this.fetchStory()
      } catch (error) {
        Logger.error(error, 'storyblok')()
      }

      if (loadId !== this.storyLoadId) {
        return
      }

      if (story?.content) {
        await waitForStoryblokContentRender()

        if (loadId !== this.storyLoadId) {
          return
        }
      }

      this.$emit('story-rendered', [storyFullSlug])
      emitPageRenderedEvent()
    },
    async fetchStory () {
      if (this.storyblok.fetchStory === false) {
        return
      }
      const { id, fullSlug, spaceId, timestamp, token, lang } = getStoryblokQueryParams(this.$route)

      if (id && !this.storyblokPath) {
        const previewToken = await this.$store.dispatch(`${KEY}/getPreviewToken`, {
          spaceId,
          timestamp,
          token
        })

        if (previewToken) {
          return this.$store.dispatch(`${KEY}/loadDraftStory`, {
            id,
            previewToken,
            lang
          })
        }
      }

      return this.$store.dispatch(`${KEY}/loadStory`, {
        fullSlug: this.storyblokPath || this.formatFullSlug(fullSlug)
      })
    }
  },
  async serverPrefetch () {
    const story = await this.fetchStory()
    return { story }
  },
  async asyncData ({ route, context }) {
    return new Promise<void>((resolve) => {
      const { id } = getStoryblokQueryParams(route)
      if (context && !id) {
        context.output.cacheTags.add(KEY)
      }
      resolve()
    })
  },
  async mounted () {
    await this.loadStoryAndEmitPageRendered()

    if (this.previewToken) {
      const url = `https://app.storyblok.com/f/storyblok-v2-latest.js`

      await loadScript(url, 'storyblok-javascript-bridge')

      const StoryblokBridge = window['StoryblokBridge'];

      const storyblokInstance = new StoryblokBridge({
        resolveRelations: ['block_reference.reference', 'page.parent']
      });

      storyblokInstance.on(['input', 'published', 'change'], (event: any) => {
        if (event.action === 'input') {
          if (event.story?.content?.parent) {
            event.story.content.parent = resolveParentData(event.story.content.parent);
          }
          this.$store.commit(`${KEY}/updateStory`, { key: event.story.id, story: event.story })
        } else if (!(event).slugChanged) {
          window.location.reload()
        }
      })
    }
  },
  watch: {
    '$route' (to, from) {
      if (!this.isStatic && from.path !== to.path) {
        this.loadStoryAndEmitPageRendered()
      }
    }
  }
}
