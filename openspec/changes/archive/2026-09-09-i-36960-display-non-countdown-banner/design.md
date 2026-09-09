## Context

`src/modules/promotion-platform/components/Banner.vue` is mounted once in the default storefront layout and reads the one selected `campaignContent.countdown` object. It currently always mounts `Timer.vue`, derives `isTimeOver` from `countdown.date`, and renders the directive-processed description through `v-html`. Existing default, campaign-link, and cart-state flows all converge on this same campaign state.

`PromotionPlatformService.parseResponseData()` casts and retains the complete nested countdown object rather than reconstructing its fields, so a new nested `is_timer_enabled` property already passes through default and cart-specific responses. `isCampaignEmpty()` only decides whether a campaign response contains a countdown object, discounts, or an image banner; content-level banner visibility belongs in the renderer and does not require changing that campaign decision.

The existing coupon implementations establish the internal building blocks needed by banner shortcuts: Cart getters expose coupon, cart, pending, and interaction state; `CART_SET_PENDING_COUPON` preserves intent before a usable cart exists; and `cart/applyCoupon` delegates to Magento and synchronizes totals. `MCouponItem` is a full coupon-offer card rather than an inline rich-text shortcut, while `window.budsies.applyCoupon` is an external browser integration surface rather than the internal Vue entry point needed here.

## Goals / Non-Goals

**Goals:**

- Interpret `is_timer_enabled: false` on the existing countdown payload as regular-banner presentation.
- Keep the existing top placement, storefront coverage, selected campaign, styling, blacklist, close-version, and rich-text behavior.
- Render the first valid `couponCode` directive as one safe native button shortcut at its position in banner rich text.
- Handle that button through a delegated event and project Vue-owned coupon state onto the generated control.
- Reuse existing Cart getters, pending-coupon state, and Vuex actions without changing Cart behavior.
- Make empty and invalid processed content fail closed without losing surrounding valid content.
- Preserve timer-enabled compatibility when the new field is true or absent.

**Non-Goals:**

- Add a second regular-banner campaign module, response branch, selector, rotation mechanism, or banner priority rule.
- Change Promotion Platform API requests, response parsing, Vuex campaign selection, `isCampaignEmpty()`, cache behavior, or persistence.
- Change Cart actions, coupon validation, pending-coupon persistence, notifications, synchronization, the public browser adapter, or Magento Sales Rules.
- Change image banners, discounts, manual coupon entry, existing coupon offers, cart-line offers, or `coupon_code` URL activation.
- Introduce a general sanitizer or redefine the existing trusted Promotion Platform rich-text boundary.

## Decisions

### Keep one banner contract and make only its timer optional

Add `is_timer_enabled?: boolean` to `CountdownBanner`. Derive timer use with an explicit-false check so old cached/indexed payloads remain timer-enabled. `Banner.vue` conditionally mounts `Timer.vue`, computes local remaining time, applies number color, and responds to timer completion only when the timer is enabled. A timer-disabled banner ignores `date`; Magento campaign delivery remains authoritative for activation and expiration.

The existing blacklist, close control, version persistence, colors, responsive presentation, and single `campaignContent.countdown` selection remain shared. Meaningful-content visibility is evaluated in `Banner.vue` after directive processing rather than changing campaign selection. The rendered banner container is omitted when there is no visible title, ordinary description, or supported coupon shortcut, preventing hidden content from reserving layout space.

A separate `regular_banner` response branch was rejected because it would duplicate selection and presentation and require an arbitrary priority rule. Updating response parsing was rejected because the current whole-object cast already retains nested fields. Updating `isCampaignEmpty()` was rejected because that helper answers whether campaign modules are present, not whether a particular component has renderable content.

### Parse coupon shortcuts through the existing text-directive composable

Extend `DirectiveType`, the `Directive` union, and `getDirectiveFromSpecification()` in `useTextDirectives()` with a typed `CouponCodeDirective`. The parser recognizes `{{ couponCode(CODE) }}`, trims and validates the code, and requires no related-data loading. This keeps all `{{ ... }}` syntax in one parser and lets the existing processing pipeline preserve price, product-price, and statistic directives unchanged.

`Banner.vue` accepts only the first valid `CouponCodeDirective` encountered by its existing `processTextParts` callback. It emits controlled native markup at that part's original position and contributes no markup for later coupon directives. The generated markup contains a wrapper, a `button type="button"`, a fixed opaque shortcut ID, fixed marker attributes, separate code and action-label spans, and an adjacent live feedback span. The validated coupon code remains in Vue state; event handling never trusts a code read from rich-text DOM. Directive values cannot add element names, inline handlers, URLs, styles, or arbitrary attributes.

String and existing directive results continue to be concatenated in their original order, so the native shortcut can appear inside the current rich-text output without splitting the description into separately parsed `v-html` fragments. A malformed or empty coupon directive produces no button and must not leave directive processing stuck. Banner visibility is based on rendered text semantics plus valid coupon shortcuts, so markup such as empty paragraphs does not make an otherwise empty regular banner visible.

The Storyblok rich-text consumer already branches only on directive types it supports. A parsed `CouponCodeDirective` therefore contributes no Storyblok component or button by default, while the string parts around it continue to render. No Storyblok-specific coupon branch is needed.

A separate Promotion Platform parser was rejected because it would duplicate the shared directive grammar and require an extra preprocessing pass. Splitting the description around a coupon component was rejected because a directive may occur inside an open rich-text element; separately parsing the two `v-html` fragments would repair or discard unmatched markup and Vue 2 would require additional fragment wrapper elements. Replacing the current rich-text path with a structured VNode renderer was rejected as disproportionate scope.

### Delegate native-button events from the Vue-managed container

Attach one Vue click listener to the element that owns `v-html`. The handler resolves the closest generated shortcut marker from `event.target`, verifies that the marker belongs to `event.currentTarget`, and looks up its opaque ID in the current in-memory shortcut map. Native button semantics provide mouse, Enter, and Space activation without custom keyboard listeners, and replacing inner HTML does not detach the container listener.

Before any Cart interaction, the handler exits for SSR, Storyblok preview, an unknown marker, a disabled shortcut, an in-flight shortcut request, or the existing coupon-interaction-blocked state. Because a banner has only one shortcut, one in-flight flag prevents repeated activation without a per-shortcut concurrency structure.

Inline handlers and JavaScript URLs were rejected because they create an injection boundary and bypass Vue lifecycle controls. Registering listeners individually after every `v-html` update was rejected because it requires teardown bookkeeping and can duplicate handlers. Reusing `MCouponItem` was rejected because it is a full offer card, cannot be compiled inside `v-html`, and does not match the compact inline shortcut presentation.

### Reuse Cart state and actions directly

The banner derives coupon decisions from existing Vuex state and invokes existing mutations and actions:

1. If the same code is active, issue no request and set `already-applied`.
2. If a different code is active, preserve it, issue no request, and set `conflict`.
3. If no usable server cart exists, commit the existing pending-coupon mutation, retain its established persistence and later-application path, and set `saved`.
4. Otherwise dispatch the unchanged `cart/applyCoupon` action. Set `applied` only after its successful task and totals synchronization complete; classify an unsuccessful completed result as `invalid` and a thrown request as `failed`.

Magento remains authoritative for validation and totals. The banner does not call `CartService`, create a Sales Rule, replace a coupon, alter retry behavior, or generate independent success/error notifications. Existing Cart and TaskQueue feedback remains authoritative. The external `window.budsies.applyCoupon` adapter remains unchanged and is not used by this internal Vue integration.

Calling `CartService` directly was rejected because it bypasses Vuex guards and totals synchronization. Calling the browser adapter was rejected because it is intended for external scripts and collapses invalid and failed requests into its public `rejected` result. Modifying Cart actions or extracting a new coupon workflow was rejected because the current getters, mutation, and actions already provide the required behavior.

### Keep state in Vue and project it narrowly onto generated markup

Maintain one reactive `couponShortcutState`, one validated `couponCode`, and one in-flight flag for the selected banner. Supported states are `idle`, `applying`, `saved`, `applied`, `already-applied`, `conflict`, `invalid`, and `failed`. After state changes, call a focused DOM projection helper that updates only the known generated marker's classes, `disabled`, `aria-disabled`, `aria-busy`, action-label text, feedback text, and `aria-describedby` relationship.

Presentation follows established coupon UI conventions: `Applying`, `Saved`, `Applied`, and `Already applied` appear as compact action labels; conflict uses `Locked` on the button and places `Another coupon is already applied.` in the adjacent status element because the full sentence does not fit the button. Invalid and failed outcomes re-enable the shortcut for retry while the existing request flow presents its invalid or failure feedback.

Vue state remains the source of truth because `v-html` may be rebuilt after currency-dependent directive processing or campaign updates. After setting new processed content, synchronize the stored state onto the marker on the next tick. Clear the coupon code and state when the banner version changes, and ignore an asynchronous result if its originating banner or coupon is no longer current.

Regenerating the complete `v-html` value for every state change was rejected because it replaces unrelated rich-text nodes and can drop button focus. Treating DOM attributes as the only state was rejected because content reprocessing would lose the state.

### Keep coupon activation browser-only and preview-inert

SSR may render the generated coupon markup, but it is non-interactive and dispatches no action. The handler checks the existing `isServer` boundary before Cart interaction. On client mount, the banner determines Storyblok preview state and keeps every shortcut disabled in preview; otherwise it synchronizes the initial enabled state after hydration.

## Risks / Trade-offs

- [The backend omits `is_timer_enabled` for older or cached records] → Treat only explicit `false` as timer-disabled, preserving current countdown behavior.
- [A timer-disabled payload retains an expired countdown date] → Never calculate or apply local countdown expiry in regular-banner mode; rely on selected campaign delivery.
- [Rich-text markup contains only non-visible elements] → Determine meaningful content after directive processing and omit the banner container when nothing visible remains.
- [Malformed coupon syntax could leave directive processing pending] → Validate coupon directives in the shared parser, omit invalid actions without losing surrounding text, and ensure processing state is always released.
- [Shared parsing could make Storyblok render an unintended coupon] → Keep Storyblok's processor unchanged so it ignores the unsupported typed directive while retaining surrounding string parts.
- [Generated coupon markup becomes an injection path] → Validate coupon codes, emit a fixed markup shape, use opaque IDs, escape all text, and never emit inline handlers, URLs, or directive-provided attributes.
- [Direct DOM projection diverges from Vue state] → Keep the single reactive state authoritative and resynchronize the known marker after each processed-content update.
- [A state update replaces focused rich text] → Mutate only controlled marker attributes and text rather than regenerating the full `v-html` value.
- [A late coupon result updates a replaced campaign] → Capture the banner version and coupon code and discard results that no longer belong to current content.
- [Authors configure multiple coupon directives] → Render the first valid directive only and omit later directives while preserving surrounding ordinary content.
- [Scoped component CSS does not reach `v-html` descendants] → Style fixed marker classes through the project's Vue 2 deep-selector convention or a deliberately scoped global selector.

## Migration Plan

Deploy after Magento Feature #36935 exposes `is_timer_enabled` on the existing countdown object. No stored storefront state migration is needed: old payloads default to countdown behavior, and the existing banner version close state remains valid. Rollback restores unconditional timer rendering and removes the coupon directive type, generated marker, delegated handler, and banner-local state; Promotion Platform payloads, Cart state, and coupon persistence remain compatible.

## Open Questions

None blocking. This design assumes the Magento delivery contract described for #36935: one selected banner remains under `campaignContent.countdown`, with `is_timer_enabled` as an optional nested boolean.
