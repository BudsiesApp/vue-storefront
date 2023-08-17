<template>
  <div class="raffle-winner">
    <SfHeading :level="2" :title="$t('Congrats!')" />

    <SfHeading
      class="_title"
      :level="3"
      :title="$t('You\'ve Won Early Access to Specialty Commissions')"
    />

    <router-link
      class="_button"
      :to="{
        name: 'specialty-commissions-creation',
        query: {
          token
        }
      }"
    >
      <SfButton>
        {{ $t('Get Started') }}
      </SfButton>
    </router-link>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import { SfButton, SfHeading } from '@storefront-ui/vue';

export default Vue.extend({
  name: 'RaffleWinner',
  components: {
    SfButton,
    SfHeading
  },
  props: {
    token: {
      type: String,
      required: true
    }
  }
})
</script>

<style lang="scss" scoped>
.raffle-winner {
  text-align: center;

  ._title,
  ._button {
    margin-top: var(--spacer-base);
  }

  ._button {
    display: inline-block;
  }

}
</style>
