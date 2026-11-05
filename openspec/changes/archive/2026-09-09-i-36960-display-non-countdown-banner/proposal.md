## Why

Magento Feature #36935 delivers scheduled promotional banners through Promotion Platform campaigns, but the storefront currently assumes every delivered top banner is a countdown and hides it according to a client-side timer. The storefront must render the same campaign content as a regular rich-text banner when the timer is disabled, including actionable coupon shortcuts, without changing established campaign selection or coupon behavior.

## What Changes

- Treat the existing Promotion Platform countdown payload as a top promotional banner whose timer is optional, with missing timer configuration retaining current countdown behavior.
- Render timer-disabled banner title and rich-text content in the existing top-of-storefront placement without mounting timer UI or applying client-side countdown expiration.
- Support at most one coupon directive per banner, rendered as a safe native button shortcut at the first valid directive's position in the rich-text content and handled through the banner container.
- Reuse existing Cart getters, pending-coupon state, and Vuex actions while preserving applied, pending, already-applied, conflicting, invalid, and failed outcomes.
- Prevent coupon interaction during SSR and Storyblok editor preview.
- Suppress empty banner presentation and tolerate malformed or unsupported coupon directives without hiding surrounding ordinary content.
- Preserve current countdown, image-banner, discount, manual coupon-entry, coupon-offer, cart-line-offer, campaign-selection, and `coupon_code` URL behavior.

## Capabilities

### New Capabilities

- `promotion-platform-regular-banner`: Defines optional-timer top-banner rendering, rich-text and coupon-directive presentation, visibility safeguards, and compatibility with existing campaign and coupon flows.

### Modified Capabilities

<!-- No existing capability requirements change. The existing coupon-activation contract is consumed unchanged. -->

## Impact

- Affects the Promotion Platform banner component, countdown banner TypeScript contract, shared text-directive types and parsing, and generated coupon-shortcut presentation.
- Reuses existing Cart getters, the pending-coupon mutation and persistence, and `cart/applyCoupon`; no Cart-module, coupon-validation, Promotion Platform selection, API request, cache, or persistence logic changes are required.
- Leaves `MCouponItem`, Storyblok and cart-line coupon offers, and the external `window.budsies.applyCoupon` API unchanged.
- Assumes Magento Feature #36935 continues delivering one selected campaign banner through the existing `campaignContent.countdown` object and adds the optional timer-enabled field to that nested payload.
