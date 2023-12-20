import { add } from 'src/modules/vsf-storyblok-module/components'

export default function registerComponents () {
  add('affirm_educational_message', () => import(/* webpackChunkName: "vsf-affirm-storyblok-components" */ './AffirmEducationalMessage.vue'))
  add('affirm_monthly_payment', () => import(/* webpackChunkName: "vsf-affirm-storyblok-components" */ './AffirmMonthlyPayment.vue'))
}
