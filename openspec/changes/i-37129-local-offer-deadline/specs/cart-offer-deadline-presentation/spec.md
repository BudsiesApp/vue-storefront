# Spec Delta

## Purpose

Present Magento offer expiration instants consistently in the customer's browser timezone across cart deadline displays, including saved-cart and initial-render behavior.

## ADDED Requirements

### Requirement: Offer deadlines display the browser-local instant

The storefront SHALL interpret populated `offer_expiration_date` values as the RFC 3339 UTC instant supplied by Magento. The displayed deadline MUST include year, month, day, hours, minutes, and a short timezone label using the browser's default locale and timezone. Seconds SHALL be omitted without rounding to the next minute. Labels expressed as GMT offsets SHALL be accepted. Shipping country and detected location MUST NOT select the display timezone.

#### Scenario: New York browser

- **WHEN** a mounted deadline display receives `2026-10-22T03:59:59Z` in an en-US browser configured for America/New_York
- **THEN** it displays October 21, 2026 at 11:59 PM with a short timezone label appropriate to that instant, such as EDT or GMT-4

#### Scenario: Los Angeles browser

- **WHEN** the same instant is displayed in an en-US browser configured for America/Los_Angeles
- **THEN** it displays October 21, 2026 at 8:59 PM with a short timezone label appropriate to that instant, such as PDT or GMT-7

#### Scenario: UTC browser

- **WHEN** the same instant is displayed in an en-US browser configured for UTC
- **THEN** it displays October 22, 2026 at 3:59 AM with a short timezone label such as UTC or GMT
- **AND** the input seconds `59` are omitted, retaining the represented minute `03:59` rather than rounding to `04:00`

#### Scenario: Locale and shipping country differ

- **WHEN** a browser uses another locale and a shipping country unrelated to its configured timezone
- **THEN** the date, time, and timezone label follow that browser's locale and timezone without requiring English punctuation or abbreviations

### Requirement: Both cart deadline displays preserve translation and reactivity

Both cart deadline displays SHALL use the same formatting behavior within the existing translated `if you order by {date}` message. A change to the supplied expiration SHALL update the displayed deadline without remounting. Existing Magento shipment promises and offer eligibility MUST remain unchanged; display formatting MUST NOT become an eligibility calculation.

#### Scenario: Both cart surfaces receive the same shipment data

- **WHEN** the detailed cart shipment display and cart configuration display receive the same expiration in the same browser
- **THEN** both show the same translated order-by message and local deadline
- **AND** their existing shipment promise content remains unchanged

#### Scenario: API refresh replaces expiration

- **WHEN** an existing cart refresh replaces shipment data with another UTC expiration timestamp
- **THEN** both mounted displays update to the new local deadline without changing cart selections or eligibility

### Requirement: Initial rendering omits customer-local deadlines

Server output and the initial client render before mounting SHALL omit offer deadline text. After mounting, each display SHALL format its available expiration in the browser timezone. Server timezone differences MUST NOT introduce deadline hydration differences or server-local deadline text.

#### Scenario: Normal cart request

- **WHEN** the detailed cart is rendered on the server and initially hydrated
- **THEN** its existing loading shell contains no offer deadline
- **AND** available deadlines appear locally after the client renders and mounts the cart items

#### Scenario: Consumer receives data during server rendering

- **WHEN** either shared deadline display is server-rendered with a populated expiration and then hydrated in a different timezone
- **THEN** server output and initial client output both omit deadline text
- **AND** the local deadline appears after mounting without a deadline hydration mismatch

### Requirement: Absent and legacy saved-cart deadlines are omitted

A missing shipment, missing expiration field, null expiration, or existing empty string SHALL produce no order-by deadline. A legacy saved-cart `YYYY-MM-DD` expiration SHALL also produce no deadline until existing cart refresh behavior supplies a full UTC timestamp. The storefront MUST NOT reconstruct a cutoff time from a date-only value or require a global cache migration or reload.

#### Scenario: No expiration exists

- **WHEN** either display receives missing shipment data, an absent expiration field, null, or an empty expiration string
- **THEN** no order-by deadline is rendered and any shipment promise continues to render normally

#### Scenario: Date-only saved cart survives rollout

- **WHEN** saved cart data supplies `2026-10-21` and no API refresh has replaced it
- **THEN** no deadline or fabricated local cutoff is displayed and the cart remains usable

#### Scenario: Existing refresh replaces a legacy or absent value

- **WHEN** an existing cart refresh replaces a legacy or absent expiration with `2026-10-22T03:59:59Z`
- **THEN** both mounted deadline displays show the browser-local instant without a reload

#### Scenario: Refresh removes a deadline

- **WHEN** an existing cart refresh replaces a timestamp with a null or absent expiration
- **THEN** both mounted deadline displays remove the order-by message
