<template>
  <span class="notice-of-financial-incentive-link">
    <a
      class="truevault-polaris-privacy-notice"
      :href="$privacyPolicy.financialIncentiveNoticeUrl"
      noreferrer
      noopener
      hidden
    >
      Notice of Financial Incentive
    </a>
  </span>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'NoticeOfFinancialIncentiveLink'
})
</script>

<style lang="scss" scoped>
.notice-of-financial-incentive-link {
  .truevault-polaris-privacy-notice {
    font-size: var(--font-xs);

    &:not([disabled]) {
      display: var(--financial-incentive-link-display, inline);
      margin: var(--financial-incentive-link-margin, 0)
    }
  }
}
</style>
