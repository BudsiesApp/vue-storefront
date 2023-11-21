import Vue from 'vue'

declare module 'vue/types/vue' {
  interface Vue {
    $privacyPolicy: {
      url: string,
      californiaPrivacyNoticeUrl: string,
      financialIncentiveNoticeUrl: string,
      optOutUrl: string
    }
  }
}
