export interface StoryblokStory {
  loading: boolean,
  loadingPromise?: Promise<Record<string, any>>,
  story: Record<string, any>
}

export interface StoryblokStories {
  [key: string]: StoryblokStory
}

export interface StoryblokState {
  previewToken?: string,
  storeCode: string,
  stories: StoryblokStories,
  supportsWebp: boolean
}
