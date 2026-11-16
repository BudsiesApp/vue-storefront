import VueRouter from 'vue-router'

const checkoutSections = ['personalDetails', 'shipping', 'payment', 'orderReview']

export function removeRedirectedSectionHash (router: VueRouter): void {
  const { path, query, hash } = router.currentRoute

  if (!checkoutSections.includes(hash.replace('#', ''))) {
    return
  }

  router.replace({ path, query }, undefined, () => {})
}
