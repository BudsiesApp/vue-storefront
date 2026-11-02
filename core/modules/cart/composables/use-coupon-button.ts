import { useI18n, useStore } from '@vue-storefront/core/application-services';
import { ComputedRef, computed, ref, watch } from 'vue';

import { notifications } from '../helpers';
import { SN_CART } from '../store/mutation-types';
import {
  IS_CART_SYNCING,
  IS_COUPON_INTERACTION_BLOCKED,
  IS_COUPON_PROCESSING
} from '../store/getter-types';
import AppliedCoupon from '../types/AppliedCoupon';

export type CouponButtonState = 'applied' | 'applying' | 'hidden' | 'idle' | 'locked'

export interface CouponButtonResult {
  applyCoupon: () => Promise<boolean>,
  appliedCoupon: ComputedRef<AppliedCoupon | false>,
  isCartSyncing: ComputedRef<boolean>,
  isCouponInteractionBlocked: ComputedRef<boolean>,
  isCouponProcessing: ComputedRef<boolean>,
  state: ComputedRef<CouponButtonState>,
  shouldRender: ComputedRef<boolean>
}

export function useCouponButton (
  couponCode: ComputedRef<string | undefined>
): CouponButtonResult {
  const applicationStore = useStore();
  const applicationI18n = useI18n();
  const isApplyingCoupon = ref<boolean>(false);
  const appliedCoupon = computed<AppliedCoupon | false>(() => {
    return applicationStore.getters['cart/getCoupon'];
  });
  const isCartSyncing = computed<boolean>(() => {
    return applicationStore.getters[`${SN_CART}/${IS_CART_SYNCING}`];
  });
  const isCouponInteractionBlocked = computed<boolean>(() => {
    return applicationStore.getters[`${SN_CART}/${IS_COUPON_INTERACTION_BLOCKED}`];
  });
  const isCouponProcessing = computed<boolean>(() => {
    return applicationStore.getters[`${SN_CART}/${IS_COUPON_PROCESSING}`];
  });
  const state = computed<CouponButtonState>(() => {
    if (!couponCode.value) {
      return 'hidden';
    }

    if (appliedCoupon.value && appliedCoupon.value.code === couponCode.value) {
      return 'applied';
    }

    if (appliedCoupon.value) {
      return 'locked';
    }

    if (isCouponProcessing.value && isApplyingCoupon.value) {
      return 'applying';
    }

    return 'idle';
  });
  const shouldRender = computed<boolean>(() => {
    return state.value !== 'hidden';
  });

  watch(isCouponProcessing, (value: boolean) => {
    if (!value) {
      isApplyingCoupon.value = false;
    }
  });

  const createNotification = (type: string, message: string): void => {
    applicationStore.dispatch(
      'notification/spawnNotification',
      notifications.createNotification({
        type,
        message,
        timeToLive: 5 * 1000
      }),
      { root: true }
    );
  };

  const applyCoupon = async (): Promise<boolean> => {
    if (!couponCode.value || isCouponInteractionBlocked.value) {
      return false;
    }

    if (state.value === 'applied' || state.value === 'hidden' || state.value === 'locked') {
      return false;
    }

    if (state.value !== 'idle') {
      return false;
    }

    isApplyingCoupon.value = true;

    try {
      const result = await applicationStore.dispatch('cart/applyCoupon', { couponCode: couponCode.value });

      if (!result?.code || result.code !== 200) {
        return false;
      }

      createNotification('success', applicationI18n.t('Coupon applied.').toString());
      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    applyCoupon,
    appliedCoupon,
    isCartSyncing,
    isCouponInteractionBlocked,
    isCouponProcessing,
    state,
    shouldRender
  };
}
