import { onMounted } from 'vue'

import { useRouter } from '@vue-storefront/core/application-services'

import { removeRedirectedSectionHash } from '../helpers/remove-redirected-section-hash.function'

export function useRedirectedSectionHashRemoval (): void {
  const router = useRouter()

  onMounted(() => removeRedirectedSectionHash(router))
}
