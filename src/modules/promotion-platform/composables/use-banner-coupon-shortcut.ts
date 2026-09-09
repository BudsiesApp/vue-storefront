import { useI18n, useStore } from '@vue-storefront/core/application-services';
import { CouponButtonState, useCouponButton } from '@vue-storefront/core/modules/cart';
import { notifications } from '@vue-storefront/core/modules/cart/helpers';
import { CART_SET_PENDING_COUPON } from '@vue-storefront/core/modules/cart/store/mutation-types';
import { computed, nextTick, Ref, ref, watch } from 'vue';

import { CouponCodeDirective } from 'src/modules/shared/composables/use-text-directives';

type CouponShortcutState = CouponButtonState | 'saved';

const PENDING_COUPON_SAVING_TIMEOUT = 700;
const couponShortcutId = 'promotion-platform-coupon-shortcut';
const couponShortcutMarker = 'data-promotion-platform-coupon-shortcut-id';

export function useBannerCouponShortcut (contentElement: Ref<HTMLElement | null>) {
  const applicationStore = useStore();
  const applicationI18n = useI18n();
  const currentCouponCode = ref<string | undefined>();
  const couponCode = computed<string | undefined>(() => currentCouponCode.value);
  const isSavingPendingCoupon = ref<boolean>(false);

  const pendingCouponCode = computed<string | null>(() => {
    return applicationStore.getters['cart/getPendingCouponCode'];
  });
  const isCouponSaved = computed<boolean>(() => {
    return Boolean(couponCode.value) && pendingCouponCode.value === couponCode.value;
  });
  const hasServerCart = computed<boolean>(() => {
    return Boolean(applicationStore.getters['cart/getCartToken']);
  });
  const hasCartItems = computed<boolean>(() => {
    return Boolean(applicationStore.getters['cart/getCartItems']?.length);
  });
  const {
    applyCoupon,
    isCouponInteractionBlocked,
    state: couponButtonState
  } = useCouponButton(couponCode);
  const displayState = computed<CouponShortcutState>(() => {
    if (isSavingPendingCoupon.value) {
      return 'applying';
    }

    if (isCouponSaved.value) {
      return 'saved';
    }

    return couponButtonState.value;
  });
  const isActionDisabled = computed<boolean>(() => {
    return isCouponInteractionBlocked.value ||
      displayState.value !== 'idle';
  });

  function getShortcutDetails (): { actionLabel: string, hint?: string } {
    if (displayState.value === 'applying') {
      return { actionLabel: applicationI18n.t('Applying').toString() };
    }

    if (displayState.value === 'saved') {
      return { actionLabel: applicationI18n.t('Saved').toString() };
    }

    if (displayState.value === 'applied') {
      return { actionLabel: applicationI18n.t('Applied').toString() };
    }

    if (displayState.value === 'locked') {
      return {
        actionLabel: applicationI18n.t('Locked').toString(),
        hint: applicationI18n.t('Another coupon is already applied.').toString()
      };
    }

    return { actionLabel: applicationI18n.t('Apply').toString() };
  }

  function resetDirectiveCouponCode (): void {
    currentCouponCode.value = undefined;
  }

  function renderCouponShortcut (directive: CouponCodeDirective): string {
    if (currentCouponCode.value) {
      return '';
    }

    currentCouponCode.value = directive.couponCode;

    const details = getShortcutDetails();
    const state = displayState.value;
    const isDisabled = isActionDisabled.value;

    return `
      <button
        type="button"
        class="promotion-platform-coupon-shortcut__button -${state}"
        ${couponShortcutMarker}="${couponShortcutId}"
        aria-busy="${state === 'applying'}"
        aria-disabled="${isDisabled}"
        title="${details.hint || ''}"
        ${isDisabled ? 'disabled' : ''}
      >
        <span class="promotion-platform-coupon-shortcut__code">${directive.couponCode}</span>
        <span class="promotion-platform-coupon-shortcut__action" data-promotion-platform-coupon-shortcut-action>${details.actionLabel}</span>
      </button>
    `.trim();
  }

  async function syncCouponShortcutState (): Promise<void> {
    await nextTick();

    const button = contentElement.value?.querySelector<HTMLButtonElement>(
      `[${couponShortcutMarker}="${couponShortcutId}"]`
    );

    if (!button) {
      return;
    }

    const details = getShortcutDetails();
    const action = button.querySelector<HTMLElement>(
      '[data-promotion-platform-coupon-shortcut-action]'
    );

    button.className = `promotion-platform-coupon-shortcut__button -${displayState.value}`;
    button.classList.toggle('-disabled', isActionDisabled.value);
    button.disabled = isActionDisabled.value;
    button.setAttribute('aria-busy', String(displayState.value === 'applying'));
    button.setAttribute('aria-disabled', String(isActionDisabled.value));
    button.title = details.hint || '';

    if (action) {
      action.textContent = details.actionLabel;
    }
  }

  function notifyPendingCouponSaved (): void {
    applicationStore.dispatch(
      'notification/spawnNotification',
      notifications.createNotification({
        type: 'success',
        message: applicationI18n.t('Coupon saved. It will be applied automatically when you add items to your cart.').toString(),
        timeToLive: 5 * 1000
      }),
      { root: true }
    );
  }

  function savePendingCoupon (): void {
    if (!couponCode.value || isActionDisabled.value) {
      return;
    }

    isSavingPendingCoupon.value = true;
    applicationStore.commit(`cart/${CART_SET_PENDING_COUPON}`, couponCode.value);

    setTimeout(() => {
      isSavingPendingCoupon.value = false;
      notifyPendingCouponSaved();
    }, PENDING_COUPON_SAVING_TIMEOUT);
  }

  async function activateCouponShortcut (): Promise<void> {
    if (!couponCode.value) {
      return;
    }

    if (!hasServerCart.value || !hasCartItems.value) {
      savePendingCoupon();
      return;
    }

    await applyCoupon();
  }

  async function onCouponShortcutClick (event: MouseEvent): Promise<void> {
    const content = contentElement.value;

    if (!content || event.currentTarget !== content || !(event.target instanceof Element)) {
      return;
    }

    const button = event.target.closest<HTMLButtonElement>(`[${couponShortcutMarker}]`);

    if (!button || !content.contains(button) ||
      button.getAttribute(couponShortcutMarker) !== couponShortcutId) {
      return;
    }

    event.preventDefault();
    await activateCouponShortcut();
  }

  watch([displayState, isCouponInteractionBlocked, contentElement], () => {
    void syncCouponShortcutState();
  });

  return {
    onCouponShortcutClick,
    resetDirectiveCouponCode,
    renderCouponShortcut,
    syncCouponShortcutState
  };
}
