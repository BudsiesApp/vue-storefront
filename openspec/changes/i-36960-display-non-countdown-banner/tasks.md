## 1. Banner Contract and Directive Processing

- [x] 1.1 Extend `CountdownBanner` with backward-compatible optional `is_timer_enabled` typing, without changing Promotion Platform response parsing or campaign-empty selection logic.
- [x] 1.2 Extend the shared `useTextDirectives` types and parser with a validated `CouponCodeDirective` that requires no related-data loading and preserves surrounding rich text for every consumer.
- [x] 1.3 Make directive processing release its pending state after malformed or unsupported input so ordinary banner text cannot remain hidden.

## 2. Optional-Timer Banner Rendering

- [x] 2.1 Refactor `Banner.vue` to treat only explicit `is_timer_enabled: false` as regular-banner mode and conditionally omit `Timer.vue`, countdown calculations, timer-expiry hiding, timer callbacks, and timer-number styling in that mode.
- [ ] 2.2 Preserve the existing location, single selected banner, title and rich-text directives, colors, blacklist rules, responsive controls, and version-based close behavior while omitting the rendered banner container when its processed content is not meaningful.

## 3. Native Coupon Shortcut Rendering

- [x] 3.1 Render only the first valid coupon directive at its original rich-text position as fixed, escaped native button markup with one opaque ID, separate code and action labels, and an adjacent accessible status element; omit later directives without losing ordinary content.
- [x] 3.2 Add banner-scoped styles for generated shortcut markup using the Vue 2 deep-selector or equivalent controlled selector required for `v-html` descendants.
- [x] 3.3 Add one delegated click handler on the Vue-managed content container that resolves only current known shortcut IDs and supports native mouse and keyboard button activation without inline handlers.

## 4. Coupon Flow and State Projection

- [x] 4.1 Implement banner-local coupon activation using existing Cart getters, `CART_SET_PENDING_COUPON`, the coupon-interaction guard, and `cart/applyCoupon`, without calling `CartService`, the browser adapter, or changing coupon-module behavior.
- [ ] 4.2 Implement one Vue-owned shortcut state for idle, applying, saved, applied, already-applied, conflict, invalid, and failed outcomes, including a single in-flight guard and stale-banner result protection.
- [x] 4.3 Project state narrowly onto generated marker classes, disabled and ARIA attributes, compact action labels, and adjacent feedback; use `Locked` on conflicting buttons and place `Another coupon is already applied.` outside the button.
- [x] 4.4 Keep invalid and failed shortcut outcomes retryable while preserving the existing invalid and failure notifications, and resynchronize the stored state after processed rich text is replaced.

## 5. Validation

- [x] 5.1 Run TypeScript validation and linting for the changed files.
