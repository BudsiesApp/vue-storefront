# Spec Delta

## ADDED Requirements

### Requirement: Cart deadlines display the customer's local time

Both cart consumers SHALL show the UTC `offer_expiration_date` in the browser's default locale and timezone, using the existing translated order-by message. Include the year, date, hours, minutes, and short timezone label; omit seconds without rounding. Existing shipment promises and eligibility SHALL remain unchanged.

#### Scenario: Display a full timestamp
- **WHEN** a mounted consumer receives `2026-10-22T03:59:59Z` in an en-US browser
- **THEN** the displayed local deadline matches the browser timezone:

| Timezone | Date and time | Example zone label |
| --- | --- | --- |
| America/New_York | October 21, 2026, 11:59 PM | EDT or GMT-4 |
| America/Los_Angeles | October 21, 2026, 8:59 PM | PDT or GMT-7 |
| UTC | October 22, 2026, 3:59 AM | UTC or GMT |

Native punctuation and equivalent short timezone labels are acceptable.

#### Scenario: Render before mounting
- **WHEN** a consumer is server-rendered or initially hydrated before mounting
- **THEN** it omits the deadline until mounting enables local formatting

#### Scenario: Refresh an absent or saved date-only deadline
- **WHEN** the expiration is missing, null, empty, or a saved `YYYY-MM-DD` value
- **THEN** no order-by deadline is shown
- **AND** replacing it with a full timestamp through existing refresh displays the local deadline without remounting
