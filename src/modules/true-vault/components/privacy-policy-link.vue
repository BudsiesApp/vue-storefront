<template>
  <a
    :href="$privacyPolicy.url"
    target="_blank"
  >
    {{ $t('Privacy Policy') }}
  </a>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'PrivacyPolicyLink'
});
</script>
