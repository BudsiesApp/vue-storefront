# promotion-platform-regular-banner Specification

## Purpose

TBD: describe the storefront capability for displaying regular Promotion Platform banners.

## Requirements

### Requirement: Promotion Platform banners support timer-disabled presentation

The storefront SHALL render the single banner delivered in the selected campaign's existing `campaignContent.countdown` object in the current top-of-storefront banner location and storefront coverage. When `is_timer_enabled` is `false`, it MUST render as a regular promotional banner without countdown or timer UI and MUST NOT use the payload's countdown date for client-side visibility. When `is_timer_enabled` is `true` or absent, the existing countdown presentation and expiry behavior MUST remain unchanged.

#### Scenario: Selected campaign disables its timer

- **WHEN** the active campaign delivers a countdown object with `is_timer_enabled` set to `false`
- **THEN** the storefront MUST render its title and supported rich-text content in the existing top-banner location
- **THEN** the storefront MUST NOT mount countdown or timer UI
- **THEN** the storefront MUST NOT hide the banner by comparing the delivered countdown date with the client clock

#### Scenario: Existing campaign omits the timer flag

- **WHEN** the active campaign delivers a countdown object without `is_timer_enabled`
- **THEN** the storefront MUST retain the existing timer-enabled rendering and client-side countdown expiry behavior

#### Scenario: Existing campaign explicitly enables its timer

- **WHEN** the active campaign delivers a countdown object with `is_timer_enabled` set to `true`
- **THEN** the storefront MUST retain the existing timer-enabled rendering and client-side countdown expiry behavior

### Requirement: Regular-banner availability follows selected campaign delivery

The storefront SHALL render at most the one regular banner present in the campaign content selected by the existing Promotion Platform flow. It SHALL rely on the existing default, campaign-link, and cart-state campaign selection and backend activation and expiration handling, without adding a second campaign selector or frontend schedule.

#### Scenario: Default campaign supplies a regular banner

- **WHEN** the existing default-campaign flow selects an active campaign whose delivered banner disables its timer
- **THEN** the storefront MUST render that regular banner

#### Scenario: Campaign link supplies a regular banner

- **WHEN** the existing campaign-link flow selects an active campaign whose delivered banner disables its timer
- **THEN** the storefront MUST render that regular banner

#### Scenario: Cart state supplies a regular banner

- **WHEN** the existing cart campaign flow selects an active campaign whose delivered banner disables its timer
- **THEN** the storefront MUST render that regular banner

#### Scenario: No active campaign banner is delivered

- **WHEN** campaign activation, expiration, or selection causes the existing Promotion Platform response to omit the banner object
- **THEN** the storefront MUST NOT render regular-banner layout space

### Requirement: Regular banners render meaningful rich-text content safely

The storefront SHALL render the delivered title and supported rich-text description using the existing banner content processing. It MUST render the banner only when the processed result contains a visible title, visible ordinary description content, or a supported coupon shortcut. Empty markup and unsupported or malformed coupon shortcuts MUST NOT create blank banner space, and an invalid shortcut MUST NOT prevent surrounding ordinary content from rendering.

#### Scenario: Rich-text banner has visible content

- **WHEN** a timer-disabled banner contains a visible title or supported rich-text description
- **THEN** the storefront MUST render that content without timer UI

#### Scenario: Banner content is visually empty

- **WHEN** a timer-disabled banner contains no visible title, no visible ordinary description content, and no supported coupon shortcut after processing
- **THEN** the storefront MUST not display the banner container or reserve its layout space

#### Scenario: Coupon shortcut is malformed or unsupported

- **WHEN** a description contains a malformed or unsupported coupon shortcut together with ordinary text
- **THEN** the storefront MUST omit the invalid coupon action
- **THEN** the storefront MUST continue to render the ordinary text

### Requirement: Regular banners expose coupon shortcuts through existing storefront behavior

The shared text-directive processor SHALL recognize `{{ couponCode(CODE) }}` as a typed coupon directive. A regular banner SHALL render at most one coupon shortcut: the first valid coupon directive at its rich-text position. It SHALL omit any additional coupon directives while preserving surrounding ordinary content. The shortcut SHALL be a native button with no inline script, JavaScript URL, or arbitrary directive-provided attribute. The banner SHALL handle activation through a delegated event on the Vue-managed content container and use existing Cart getters, pending-coupon state, and Vuex actions. Text-directive consumers that do not support coupon actions SHALL omit the typed directive while preserving surrounding ordinary content. The integration MUST NOT call Cart services directly, validate Sales Rules, replace an active coupon, or independently report coupon success or failure.

#### Scenario: Customer activates a supported coupon shortcut

- **WHEN** a customer activates a valid rendered `couponCode` shortcut in a regular banner
- **THEN** the storefront MUST submit the configured code through the existing Cart Vuex coupon flow
- **THEN** Magento and the existing Cart synchronization flow MUST remain authoritative for coupon acceptance and totals

#### Scenario: Coupon shortcut reflects an in-progress request

- **WHEN** a banner coupon request is in progress
- **THEN** the shortcut MUST display its applying state
- **THEN** the shortcut MUST reject duplicate activation until the request settles

#### Scenario: Banner contains multiple coupon directives

- **WHEN** regular-banner content contains more than one valid `couponCode` directive
- **THEN** the storefront MUST render only the first valid directive as a coupon shortcut
- **THEN** it MUST omit subsequent coupon directives without suppressing surrounding ordinary content

#### Scenario: Coupon is applied

- **WHEN** Magento accepts the shortcut coupon and the existing Cart flow completes its totals synchronization
- **THEN** the shortcut MUST display `Applied` and remain disabled
- **THEN** the integration MUST NOT report success before that flow completes

#### Scenario: Coupon is saved pending a usable cart

- **WHEN** a customer activates a valid shortcut before a usable server cart exists
- **THEN** the storefront MUST save the code through the existing pending-coupon state and persistence behavior without requesting Magento application
- **THEN** the shortcut MUST display `Saved` and remain disabled
- **THEN** the existing saved-for-later feedback MUST remain unchanged

#### Scenario: Coupon is already applied

- **WHEN** the configured code is already active on the Cart
- **THEN** the storefront MUST NOT issue another coupon request
- **THEN** the shortcut MUST display `Already applied` and remain disabled

#### Scenario: Another coupon is active

- **WHEN** a different coupon is already active on the Cart
- **THEN** the storefront MUST preserve the active coupon and MUST NOT issue a replacement request
- **THEN** the shortcut button MUST display the compact `Locked` state and remain disabled
- **THEN** the adjacent shortcut feedback MUST display `Another coupon is already applied.`

#### Scenario: Coupon is invalid

- **WHEN** the existing Cart action completes without Magento accepting the configured coupon
- **THEN** the shortcut MUST return to an enabled retryable state
- **THEN** the existing invalid-coupon feedback MUST remain authoritative

#### Scenario: Coupon request fails

- **WHEN** the existing Cart action throws or cannot complete the coupon request
- **THEN** the shortcut MUST return to an enabled retryable state
- **THEN** the existing failure feedback MUST remain authoritative

#### Scenario: Another rich-text consumer receives a coupon directive

- **WHEN** a text-directive consumer that does not support coupon actions processes content containing `couponCode`
- **THEN** it MUST NOT render a coupon action
- **THEN** it MUST continue to render surrounding ordinary content

#### Scenario: Coupon shortcut is rendered during SSR

- **WHEN** a regular banner containing a coupon shortcut is server-rendered
- **THEN** the shortcut MUST be non-interactive
- **THEN** the storefront MUST NOT dispatch coupon actions or mutate Cart state

#### Scenario: Coupon shortcut is rendered in Storyblok editor preview

- **WHEN** a regular banner containing a coupon shortcut is rendered in Storyblok editor preview mode
- **THEN** its coupon action MUST be disabled
- **THEN** the storefront MUST NOT dispatch coupon actions or mutate Cart state

### Requirement: Existing promotion and coupon flows remain compatible

Adding regular-banner presentation SHALL NOT alter timer-enabled countdowns, image banners, product discounts, manual coupon entry, existing coupon offers, cart-line offers, `coupon_code` URL activation, campaign caching, or campaign persistence behavior.

#### Scenario: Existing campaign and coupon content is used

- **WHEN** the storefront processes existing timer-enabled banners, image banners, discounts, manual coupons, coupon offers, cart-line offers, or `coupon_code` URLs
- **THEN** each flow MUST retain its existing rendering, selection, activation, synchronization, and feedback behavior
