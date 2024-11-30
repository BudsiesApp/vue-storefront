<template>
  <div>
    <sb-render v-if="story && story.content" :item="story.content" />
  </div>
</template>

<script lang="ts">
import StoryblokMixin from '../components/StoryblokMixin'

export default StoryblokMixin.extend({
  name: 'StoryblokPageLayoutPage',
  mixins: []
});
</script>
